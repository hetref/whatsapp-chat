"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster, toast } from "@/components/ui/toast";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Users,
  MessageSquareText,
  XCircle,
  Eye,
  Plus,
  Trash2
} from "lucide-react";

interface Contact {
  name: string;
  phone_number: string;
  isValid: boolean;
  error?: string;
}

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  example?: Record<string, unknown>;
  buttons?: ButtonComponent[];
}

interface ButtonComponent {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
}

interface FormattedComponents {
  header: TemplateComponent | null;
  body: TemplateComponent | null;
  footer: TemplateComponent | null;
  buttons: ButtonComponent[];
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  previous_category?: string;
  rejected_reason?: string;
  quality_score?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  status_color: string;
  category_icon: string;
  formatted_components: FormattedComponents;
}

interface SendResult {
  contact: Contact;
  success: boolean;
  messageId?: string;
  error?: string;
}

export default function BulkSenderPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [variables, setVariables] = useState<{
    header: Record<string, string>;
    body: Record<string, string>;
    footer: Record<string, string>;
  }>({
    header: {},
    body: {},
    footer: {}
  });
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [mediaId, setMediaId] = useState<string>("");
  const [mediaInputType, setMediaInputType] = useState<"url" | "id">("url");
  const [searchTerm, setSearchTerm] = useState("");

  // Batch configuration
  const [batchSize, setBatchSize] = useState<number>(10);
  const [batchDelay, setBatchDelay] = useState<number>(5); // seconds
  const [batches, setBatches] = useState<Array<{
    id: number;
    contacts: Contact[];
    status: 'pending' | 'sending' | 'completed' | 'failed';
    results: SendResult[];
  }>>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(-1);
  const [currentContactInBatch, setCurrentContactInBatch] = useState<number>(0);
  const [totalContactsInCurrentBatch, setTotalContactsInCurrentBatch] = useState<number>(0);

  // Self-testing feature
  const [includeSelfTest, setIncludeSelfTest] = useState<boolean>(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>("");

  // Template quality
  const [templateQuality, setTemplateQuality] = useState<{
    rating: string;
    limit: number;
  } | null>(null);

  // Contact management
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
    // Remove all spaces and non-digit characters
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d]/g, '');

    // Check if phone number has country code and 10 digits
    // Format should be like: 919876543210 (country code + 10 digits)
    if (!/^\d{11,15}$/.test(cleanPhone)) {
      return {
        isValid: false,
        error: "Phone number must include country code and 10 digits (e.g., 919876543210)"
      };
    }

    // Check if it starts with a valid country code (at least 1 digit)
    if (cleanPhone.length < 11) {
      return {
        isValid: false,
        error: "Phone number too short. Must include country code and 10 digits"
      };
    }

    return { isValid: true };
  };

  // Calculate quality-based message limits per Meta's documentation
  const getQualityInfo = (template: WhatsAppTemplate): { rating: string; limit: number; color: string } => {
    const qualityScore = template.quality_score as any;

    // Check quality score structure from Meta API
    // quality_score: { score: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN', date: timestamp }
    const rating = qualityScore?.score || 'UNKNOWN';

    let limit = 1000; // Default safe limit
    let color = 'text-gray-600';

    switch (rating.toUpperCase()) {
      case 'HIGH':
        limit = 100000; // High quality: up to 100K messages/day
        color = 'text-green-600';
        break;
      case 'MEDIUM':
        limit = 10000; // Medium quality: up to 10K messages/day  
        color = 'text-yellow-600';
        break;
      case 'LOW':
        limit = 1000; // Low quality: up to 1K messages/day
        color = 'text-orange-600';
        break;
      case 'PENDING':
      case 'FLAGGED':
        limit = 250; // Restricted
        color = 'text-red-600';
        break;
      default:
        limit = 1000; // Unknown/unrated: conservative limit
        color = 'text-gray-600';
    }

    return { rating, limit, color };
  };

  // Create batches from valid contacts
  const createBatches = (validContacts: Contact[]): void => {
    const batchesArray = [];
    let contactsToProcess = [...validContacts];

    // Add test number to each batch if enabled
    if (includeSelfTest && testPhoneNumber) {
      const validation = validatePhoneNumber(testPhoneNumber);
      if (validation.isValid) {
        const testContact: Contact = {
          name: '🧪 Test (You)',
          phone_number: testPhoneNumber.replace(/\s+/g, '').replace(/[^\d]/g, ''),
          isValid: true
        };

        // Add test contact to beginning of each batch
        for (let i = 0; i < contactsToProcess.length; i += batchSize) {
          const batchContacts = contactsToProcess.slice(i, i + batchSize);
          batchesArray.push({
            id: batchesArray.length + 1,
            contacts: [testContact, ...batchContacts],
            status: 'pending' as const,
            results: []
          });
        }
      } else {
        toast('Invalid test phone number format. Skipping self-test.', "warning");
        // Create batches without test contact
        for (let i = 0; i < contactsToProcess.length; i += batchSize) {
          batchesArray.push({
            id: batchesArray.length + 1,
            contacts: contactsToProcess.slice(i, i + batchSize),
            status: 'pending' as const,
            results: []
          });
        }
      }
    } else {
      // Create batches without test contact
      for (let i = 0; i < contactsToProcess.length; i += batchSize) {
        batchesArray.push({
          id: batchesArray.length + 1,
          contacts: contactsToProcess.slice(i, i + batchSize),
          status: 'pending' as const,
          results: []
        });
      }
    }

    setBatches(batchesArray);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset previous state
    setSelectedFile(file);
    setContacts([]);
    setSelectedTemplate(null);
    setSendResults([]);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        // Check if CSV has header
        if (lines.length < 2) {
          toast('CSV file must contain at least a header row and one data row', "error");
          setIsProcessing(false);
          setSelectedFile(null);
          return;
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIndex = headers.findIndex(h => h === 'name');
        const phoneIndex = headers.findIndex(h => h === 'phone_number' || h === 'phone');

        if (nameIndex === -1 || phoneIndex === -1) {
          toast('CSV must contain "name" and "phone_number" columns', "error");
          setIsProcessing(false);
          setSelectedFile(null);
          return;
        }

        // Parse data rows
        const parsedContacts: Contact[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());

          if (values.length < 2) continue; // Skip invalid rows

          const name = values[nameIndex] || '';
          const phone = values[phoneIndex] || '';

          // Skip empty rows
          if (!name && !phone) continue;

          const validation = validatePhoneNumber(phone);

          parsedContacts.push({
            name,
            phone_number: phone.replace(/\s+/g, '').replace(/[^\d]/g, ''),
            isValid: validation.isValid,
            error: validation.error
          });
        }

        if (parsedContacts.length === 0) {
          toast('No valid contacts found in CSV file', "error");
          setIsProcessing(false);
          setSelectedFile(null);
          return;
        }

        setContacts(parsedContacts);
        setIsProcessing(false);

        // Show summary
        const validCount = parsedContacts.filter(c => c.isValid).length;
        const invalidCount = parsedContacts.length - validCount;

        if (invalidCount > 0) {
          toast(`Processed ${parsedContacts.length} contacts: ${validCount} valid, ${invalidCount} invalid. Please review invalid contacts.`, "warning", 7000);
        } else {
          toast(`✓ Successfully processed ${validCount} valid contacts`, "success");
        }

      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast('Failed to parse CSV file. Please check the format.', "error");
        setIsProcessing(false);
        setSelectedFile(null);
      }
    };

    reader.onerror = () => {
      toast('Failed to read file', "error");
      setIsProcessing(false);
      setSelectedFile(null);
    };

    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/bulk-message-template.csv';
    link.download = 'bulk-message-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);

    try {
      const response = await fetch('/api/templates?status=APPROVED');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch templates');
      }

      setTemplates(result.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast(`Failed to load templates: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSelectTemplate = () => {
    setShowTemplateSelector(true);
    fetchTemplates();
  };

  const hasMediaHeader = (template: WhatsAppTemplate): { hasMedia: boolean; format?: string } => {
    const headerComponent = template.components.find(c => c.type === 'HEADER');
    const hasMedia = headerComponent?.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format);
    return { hasMedia: !!hasMedia, format: headerComponent?.format };
  };

  const extractVariables = (template: WhatsAppTemplate): {
    header: string[];
    body: string[];
    footer: string[];
    all: string[];
  } => {
    const headerVariables: string[] = [];
    const bodyVariables: string[] = [];
    const footerVariables: string[] = [];

    template.components.forEach(component => {
      if (component.text) {
        const matches = component.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          const componentVariables = matches.map(match => match.replace(/[{}]/g, ''));

          switch (component.type) {
            case 'HEADER':
              componentVariables.forEach(variable => {
                if (!headerVariables.includes(variable)) {
                  headerVariables.push(variable);
                }
              });
              break;
            case 'BODY':
              componentVariables.forEach(variable => {
                if (!bodyVariables.includes(variable)) {
                  bodyVariables.push(variable);
                }
              });
              break;
            case 'FOOTER':
              componentVariables.forEach(variable => {
                if (!footerVariables.includes(variable)) {
                  footerVariables.push(variable);
                }
              });
              break;
          }
        }
      }
    });

    headerVariables.sort((a, b) => parseInt(a) - parseInt(b));
    bodyVariables.sort((a, b) => parseInt(a) - parseInt(b));
    footerVariables.sort((a, b) => parseInt(a) - parseInt(b));

    const allVariables = [...new Set([...headerVariables, ...bodyVariables, ...footerVariables])]
      .sort((a, b) => parseInt(a) - parseInt(b));

    return {
      header: headerVariables,
      body: bodyVariables,
      footer: footerVariables,
      all: allVariables
    };
  };

  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);

    // Initialize variables and media inputs
    setVariables({
      header: {},
      body: {},
      footer: {}
    });
    setMediaUrl("");
    setMediaId("");
    setMediaInputType("url");

    // Calculate and set template quality
    const qualityInfo = getQualityInfo(template);
    setTemplateQuality({
      rating: qualityInfo.rating,
      limit: qualityInfo.limit
    });

    // Reset batch configuration
    setBatches([]);
    setCurrentBatchIndex(-1);
    setSendResults([]);
  };

  const handleAddContact = () => {
    if (!newContactName.trim()) {
      toast('Please enter a contact name', "warning");
      return;
    }
    if (!newContactPhone.trim()) {
      toast('Please enter a phone number', "warning");
      return;
    }

    const cleanPhone = newContactPhone.replace(/\s+/g, '').replace(/[^\d]/g, '');

    // Check for duplicates
    if (contacts.some(c => c.phone_number === cleanPhone)) {
      toast('This phone number already exists in the list', "warning");
      return;
    }

    const validation = validatePhoneNumber(cleanPhone);

    const newContact: Contact = {
      name: newContactName,
      phone_number: cleanPhone,
      isValid: validation.isValid,
      error: validation.error
    };

    setContacts([...contacts, newContact]);
    setNewContactName("");
    setNewContactPhone("");
    setShowAddContact(false);

    if (validation.isValid) {
      toast('Contact added successfully', "success");
    } else {
      toast(`Contact added but has invalid phone number: ${validation.error}`, "warning", 7000);
    }
  };

  const handleDeleteContact = (index: number) => {
    const contact = contacts[index];
    setContacts(contacts.filter((_, i) => i !== index));
    toast(`Removed ${contact.name} from the list`, "info");
  };

  const handleConfirmSend = () => {
    if (!selectedTemplate) {
      toast('Please select a template first', "warning");
      return;
    }

    const validContacts = contacts.filter(c => c.isValid);
    if (validContacts.length === 0) {
      toast('No valid contacts to send messages to', "warning");
      return;
    }

    // Check if template has media header and validate media input
    const mediaHeader = hasMediaHeader(selectedTemplate);
    if (mediaHeader.hasMedia) {
      if (!mediaUrl.trim() && !mediaId.trim()) {
        toast(`Please provide either a ${mediaHeader.format?.toLowerCase()} URL or Media ID for the header`, "warning");
        return;
      }

      // Validate URL format if URL is provided
      if (mediaUrl.trim()) {
        try {
          const url = new URL(mediaUrl);
          if (!url.protocol.startsWith('https')) {
            toast('Media URL must use HTTPS protocol', "error");
            return;
          }
        } catch {
          toast('Please provide a valid HTTPS URL for the media', "error");
          return;
        }
      }

      // Validate Media ID format if provided
      if (mediaId.trim() && !/^\d+$/.test(mediaId)) {
        toast('Media ID must be a numeric value', "error");
        return;
      }
    }

    // Validate variables if template has any
    const templateVars = extractVariables(selectedTemplate);
    const missingVars: string[] = [];

    templateVars.header.forEach(variable => {
      if (!variables.header[variable]?.trim()) {
        missingVars.push(`Header {{${variable}}}`);
      }
    });

    templateVars.body.forEach(variable => {
      if (!variables.body[variable]?.trim()) {
        missingVars.push(`Body {{${variable}}}`);
      }
    });

    templateVars.footer.forEach(variable => {
      if (!variables.footer[variable]?.trim()) {
        missingVars.push(`Footer {{${variable}}}`);
      }
    });

    if (missingVars.length > 0) {
      toast(`Please fill in all variables: ${missingVars.join(', ')}`, "warning", 7000);
      return;
    }

    // Validate self-test phone number if enabled
    if (includeSelfTest) {
      if (!testPhoneNumber.trim()) {
        toast('Please enter your test phone number or disable "Include me in every batch"', "warning");
        return;
      }
      const testValidation = validatePhoneNumber(testPhoneNumber);
      if (!testValidation.isValid) {
        toast(`Invalid test phone number: ${testValidation.error}`, "error");
        return;
      }
    }

    // Create batches and show confirmation
    createBatches(validContacts);
    setShowConfirmation(true);
  };

  const handleBulkSend = async () => {
    if (!selectedTemplate || batches.length === 0) return;

    setShowConfirmation(false);
    setIsSending(true);
    setSendResults([]);

    // Process batches one by one
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      setCurrentBatchIndex(batchIndex);
      const batch = batches[batchIndex];
      setTotalContactsInCurrentBatch(batch.contacts.length);
      setCurrentContactInBatch(0);

      // Update batch status to sending
      setBatches(prev => prev.map((b, idx) =>
        idx === batchIndex ? { ...b, status: 'sending' as const } : b
      ));

      const batchResults: SendResult[] = [];

      // Send messages to all contacts in this batch
      for (let contactIndex = 0; contactIndex < batch.contacts.length; contactIndex++) {
        const contact = batch.contacts[contactIndex];
        setCurrentContactInBatch(contactIndex + 1);

        try {
          const response = await fetch('/api/send-template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: contact.phone_number,
              contactName: contact.name,
              templateName: selectedTemplate.name,
              templateData: selectedTemplate,
              variables: variables,
              mediaUrl: mediaUrl || undefined,
              mediaId: mediaId || undefined
            }),
          });

          const result = await response.json();

          if (response.ok) {
            batchResults.push({
              contact,
              success: true,
              messageId: result.messageId
            });
          } else {
            batchResults.push({
              contact,
              success: false,
              error: result.error || result.message || 'Failed to send'
            });
          }
        } catch (error) {
          batchResults.push({
            contact,
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
          });
        }

        // Update batch results in real-time
        setBatches(prev => prev.map((b, idx) =>
          idx === batchIndex ? { ...b, results: [...batchResults] } : b
        ));

        // Add to overall results in real-time
        setSendResults(prev => {
          const newResults = [...prev];
          const existingIndex = newResults.findIndex(r => r.contact.phone_number === contact.phone_number);
          if (existingIndex >= 0) {
            newResults[existingIndex] = batchResults[batchResults.length - 1];
          } else {
            newResults.push(batchResults[batchResults.length - 1]);
          }
          return newResults;
        });

        // Small delay between individual messages (1 second)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update batch with results and mark as completed
      setBatches(prev => prev.map((b, idx) =>
        idx === batchIndex ? {
          ...b,
          status: 'completed' as const,
          results: batchResults
        } : b
      ));

      // Reset current contact counter
      setCurrentContactInBatch(0);

      // Wait for batch delay before next batch (unless it's the last batch)
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, batchDelay * 1000));
      }
    }

    setIsSending(false);
    setCurrentBatchIndex(-1);
    setCurrentContactInBatch(0);
    setTotalContactsInCurrentBatch(0);

    // Show summary
    const allResults = batches.flatMap(b => b.results);
    const successCount = allResults.filter(r => r.success).length;
    const failCount = allResults.length - successCount;

    if (failCount === 0) {
      toast(`✓ Successfully sent messages to all ${successCount} contacts across ${batches.length} batch${batches.length !== 1 ? 'es' : ''}!`, "success", 8000);
    } else {
      toast(`Bulk send completed! ${successCount} sent successfully, ${failCount} failed. Check the results for details.`, "warning", 10000);
    }
  };

  const validContactsCount = contacts.filter(c => c.isValid).length;
  const invalidContactsCount = contacts.length - validContactsCount;
  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen h-full w-full overflow-y-auto">
      <Toaster />
      <div className="container max-w-6xl mx-auto p-6 space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Bulk Message Sender</h1>
            <p className="text-muted-foreground mt-1">
              Send template messages to multiple contacts at once
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download CSV Template
          </Button>
        </div>

        {/* Step 1: Upload CSV */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-green-700 dark:text-green-300 font-semibold">1</span>
              </div>
              Upload Contact List
            </CardTitle>
            <CardDescription>
              Upload a CSV file containing contact names and phone numbers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Choose CSV File
                    </>
                  )}
                </Button>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setContacts([]);
                        setSelectedTemplate(null);
                        setSendResults([]);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="h-6 w-6 p-0 hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              {contacts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">{validContactsCount} valid contacts</span>
                      </div>
                      {invalidContactsCount > 0 && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">{invalidContactsCount} invalid contacts</span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => setShowAddContact(true)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Contact
                    </Button>
                  </div>

                  {/* Add Contact Form */}
                  {showAddContact && (
                    <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Add New Contact</h4>
                        <Button
                          onClick={() => {
                            setShowAddContact(false);
                            setNewContactName("");
                            setNewContactPhone("");
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="new-contact-name" className="text-xs">Name *</Label>
                          <Input
                            id="new-contact-name"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            placeholder="Contact name"
                            className="mt-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-contact-phone" className="text-xs">Phone Number *</Label>
                          <Input
                            id="new-contact-phone"
                            value={newContactPhone}
                            onChange={(e) => setNewContactPhone(e.target.value)}
                            placeholder="919876543210"
                            className="mt-1 font-mono"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => {
                            setShowAddContact(false);
                            setNewContactName("");
                            setNewContactPhone("");
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddContact}
                          size="sm"
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Contact
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Phone Number</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2 w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.map((contact, index) => (
                          <tr key={index} className="border-t hover:bg-muted/50">
                            <td className="p-2">{contact.name}</td>
                            <td className="p-2 font-mono text-xs">{contact.phone_number}</td>
                            <td className="p-2">
                              {contact.isValid ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Valid
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600" title={contact.error}>
                                  <XCircle className="h-3 w-3" />
                                  Invalid
                                </span>
                              )}
                            </td>
                            <td className="p-2">
                              <Button
                                onClick={() => handleDeleteContact(index)}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                title="Remove contact"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Select Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-green-700 dark:text-green-300 font-semibold">2</span>
              </div>
              Select Message Template
            </CardTitle>
            <CardDescription>
              Choose a WhatsApp approved template to send
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Button
                  onClick={handleSelectTemplate}
                  disabled={contacts.length === 0 || validContactsCount === 0}
                  className="gap-2"
                >
                  <MessageSquareText className="h-4 w-4" />
                  {selectedTemplate ? 'Change Template' : 'Select Template'}
                </Button>
                {contacts.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Please upload a CSV file with contacts first
                  </p>
                )}
                {contacts.length > 0 && validContactsCount === 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    No valid contacts found. Please check phone number format.
                  </p>
                )}
              </div>

              {selectedTemplate && (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedTemplate.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedTemplate.category}</p>
                    </div>
                    <span className="text-2xl">{selectedTemplate.category_icon}</span>
                  </div>

                  {/* Template Preview */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {/* Header Preview */}
                    {selectedTemplate.formatted_components.header && (
                      <div className="space-y-1">
                        {selectedTemplate.formatted_components.header.format === 'IMAGE' && (
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <span>📷</span>
                            <span className="font-medium">Header: Image</span>
                          </div>
                        )}
                        {selectedTemplate.formatted_components.header.format === 'VIDEO' && (
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <span>🎥</span>
                            <span className="font-medium">Header: Video</span>
                          </div>
                        )}
                        {selectedTemplate.formatted_components.header.format === 'DOCUMENT' && (
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <span>📄</span>
                            <span className="font-medium">Header: Document</span>
                          </div>
                        )}
                        {selectedTemplate.formatted_components.header.text && (
                          <p className="text-sm font-semibold">
                            {selectedTemplate.formatted_components.header.text}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Body Preview */}
                    {selectedTemplate.formatted_components.body && (
                      <p className="text-sm whitespace-pre-line">
                        {selectedTemplate.formatted_components.body.text}
                      </p>
                    )}

                    {/* Footer Preview */}
                    {selectedTemplate.formatted_components.footer && (
                      <p className="text-xs text-muted-foreground">
                        {selectedTemplate.formatted_components.footer.text}
                      </p>
                    )}
                  </div>

                  {/* Media URL Input for templates with media headers */}
                  {hasMediaHeader(selectedTemplate).hasMedia && (
                    <div className="space-y-3 border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300">
                          {hasMediaHeader(selectedTemplate).format} Required *
                        </h4>
                      </div>

                      {/* Method Selector */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={mediaInputType === "url" ? "default" : "outline"}
                          onClick={() => setMediaInputType("url")}
                          className="flex-1"
                        >
                          Use URL
                        </Button>
                        <Button
                          size="sm"
                          variant={mediaInputType === "id" ? "default" : "outline"}
                          onClick={() => setMediaInputType("id")}
                          className="flex-1"
                        >
                          Use Media ID
                        </Button>
                      </div>

                      {mediaInputType === "url" ? (
                        <div className="space-y-2">
                          <Label htmlFor="media-url" className="text-xs">
                            Public {hasMediaHeader(selectedTemplate).format} URL (HTTPS)
                          </Label>
                          <Input
                            id="media-url"
                            type="url"
                            value={mediaUrl}
                            onChange={(e) => {
                              setMediaUrl(e.target.value);
                              setMediaId(""); // Clear media ID when URL is used
                            }}
                            placeholder={`https://example.com/${hasMediaHeader(selectedTemplate).format === 'IMAGE' ? 'image.jpg' : hasMediaHeader(selectedTemplate).format === 'VIDEO' ? 'video.mp4' : 'document.pdf'}`}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground">
                            💡 Must be publicly accessible via HTTPS
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="media-id" className="text-xs">
                            Facebook Media ID
                          </Label>
                          <Input
                            id="media-id"
                            type="text"
                            value={mediaId}
                            onChange={(e) => {
                              setMediaId(e.target.value);
                              setMediaUrl(""); // Clear URL when media ID is used
                            }}
                            placeholder="123456789012345"
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground">
                            💡 Upload media to Facebook first to get a Media ID (more reliable)
                          </p>
                          <a
                            href="https://developers.facebook.com/docs/graph-api/guides/upload"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            📚 How to upload media
                            <span>↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Template Variables */}
                  {extractVariables(selectedTemplate).all.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Template Variables</h4>

                      {extractVariables(selectedTemplate).header.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-blue-600 font-medium">Header Variables</p>
                          {extractVariables(selectedTemplate).header.map((variable) => (
                            <div key={`header-${variable}`}>
                              <Label htmlFor={`bulk-header-var-${variable}`} className="text-xs">
                                {`{{${variable}}}`} *
                              </Label>
                              <Input
                                id={`bulk-header-var-${variable}`}
                                value={variables.header[variable] || ''}
                                onChange={(e) => setVariables(prev => ({
                                  ...prev,
                                  header: { ...prev.header, [variable]: e.target.value }
                                }))}
                                placeholder={`Enter value for {{${variable}}}`}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {extractVariables(selectedTemplate).body.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-green-600 font-medium">Body Variables</p>
                          {extractVariables(selectedTemplate).body.map((variable) => (
                            <div key={`body-${variable}`}>
                              <Label htmlFor={`bulk-body-var-${variable}`} className="text-xs">
                                {`{{${variable}}}`} *
                              </Label>
                              <Input
                                id={`bulk-body-var-${variable}`}
                                value={variables.body[variable] || ''}
                                onChange={(e) => setVariables(prev => ({
                                  ...prev,
                                  body: { ...prev.body, [variable]: e.target.value }
                                }))}
                                placeholder={`Enter value for {{${variable}}}`}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {extractVariables(selectedTemplate).footer.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-purple-600 font-medium">Footer Variables</p>
                          {extractVariables(selectedTemplate).footer.map((variable) => (
                            <div key={`footer-${variable}`}>
                              <Label htmlFor={`bulk-footer-var-${variable}`} className="text-xs">
                                {`{{${variable}}}`} *
                              </Label>
                              <Input
                                id={`bulk-footer-var-${variable}`}
                                value={variables.footer[variable] || ''}
                                onChange={(e) => setVariables(prev => ({
                                  ...prev,
                                  footer: { ...prev.footer, [variable]: e.target.value }
                                }))}
                                placeholder={`Enter value for {{${variable}}}`}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Template Quality & Message Limit Info */}
                  {templateQuality && (
                    <div className="border-t pt-4 mt-4">
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <span>📊</span>
                          Template Health & Messaging Limits
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-white dark:bg-gray-800 rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Quality Rating</p>
                            <p className={`text-lg font-bold ${getQualityInfo(selectedTemplate).color}`}>
                              {templateQuality.rating}
                            </p>
                          </div>

                          <div className="bg-white dark:bg-gray-800 rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Recommended Daily Limit</p>
                            <p className="text-lg font-bold text-green-600">
                              {templateQuality.limit.toLocaleString()} messages/day
                            </p>
                          </div>
                        </div>

                        {validContactsCount > templateQuality.limit && (
                          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3">
                            <p className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>
                                <strong>Warning:</strong> You have {validContactsCount} contacts, which exceeds the recommended limit of {templateQuality.limit.toLocaleString()} messages/day for {templateQuality.rating} quality templates. Consider using batch sending to spread messages over multiple days or reduce your contact list.
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Batch Configuration */}
                  {selectedTemplate && validContactsCount > 0 && (
                    <div className="border-t pt-4 mt-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <h4 className="font-semibold text-sm">Batch Configuration</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="batch-size" className="text-xs">
                            Contacts per Batch *
                          </Label>
                          <Input
                            id="batch-size"
                            type="number"
                            min="1"
                            max={validContactsCount}
                            value={batchSize}
                            onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 10))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground">
                            Split sending into batches of this size
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="batch-delay" className="text-xs">
                            Delay Between Batches (seconds) *
                          </Label>
                          <Input
                            id="batch-delay"
                            type="number"
                            min="0"
                            max="3600"
                            value={batchDelay}
                            onChange={(e) => setBatchDelay(Math.max(0, parseInt(e.target.value) || 5))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground">
                            Wait time after each batch completes
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-sm">
                          <strong>Batch Preview:</strong> {Math.ceil(validContactsCount / batchSize)} batch{Math.ceil(validContactsCount / batchSize) !== 1 ? 'es' : ''} will be created
                          {Math.ceil(validContactsCount / batchSize) > 1 && ` with ~${batchDelay}s delay between each`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Self-Testing Feature */}
                  {selectedTemplate && validContactsCount > 0 && (
                    <div className="border-t pt-4 mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="include-self-test"
                            checked={includeSelfTest}
                            onChange={(e) => setIncludeSelfTest(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <Label htmlFor="include-self-test" className="text-sm font-medium cursor-pointer">
                            🧪 Include me in every batch (for testing)
                          </Label>
                        </div>
                      </div>

                      {includeSelfTest && (
                        <div className="space-y-2 pl-6">
                          <Label htmlFor="test-phone" className="text-xs">
                            Your Phone Number *
                          </Label>
                          <Input
                            id="test-phone"
                            type="tel"
                            value={testPhoneNumber}
                            onChange={(e) => setTestPhoneNumber(e.target.value)}
                            placeholder="91XXXXXXXXXX"
                            className="mt-1 font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            Format: Country code + 10-digit number (e.g., 919876543210)
                          </p>
                          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              💡 <strong>Tip:</strong> You'll receive a test message with every batch to verify delivery success. This helps catch issues where the API returns success but messages aren't actually delivered.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Send */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-green-700 dark:text-green-300 font-semibold">3</span>
              </div>
              Send Messages
            </CardTitle>
            <CardDescription>
              Review and send template messages to all valid contacts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{validContactsCount} recipients</span>
                  </div>
                  {selectedTemplate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquareText className="h-5 w-5" />
                      <span className="text-sm">{selectedTemplate.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isSending && currentBatchIndex >= 0 && (
                    <span className="text-sm text-muted-foreground animate-pulse">
                      Batch {currentBatchIndex + 1}/{batches.length} • Sending {currentContactInBatch}/{totalContactsInCurrentBatch} • {sendResults.length} total sent
                    </span>
                  )}
                  {!isSending && batches.length > 0 && batches.every(b => b.status === 'completed') && (
                    <span className="text-sm text-green-600 font-medium">
                      ✓ All batches completed
                    </span>
                  )}
                  <Button
                    onClick={handleConfirmSend}
                    disabled={
                      !selectedTemplate ||
                      validContactsCount === 0 ||
                      isSending ||
                      !!(templateQuality && validContactsCount > templateQuality.limit && batchSize >= validContactsCount)
                    }
                    className="bg-green-600 hover:bg-green-700 gap-2"
                    title={
                      templateQuality && validContactsCount > templateQuality.limit && batchSize >= validContactsCount
                        ? 'Configure batch sending to proceed with large contact list'
                        : ''
                    }
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending {currentContactInBatch}/{totalContactsInCurrentBatch} (Batch {currentBatchIndex + 1}/{batches.length})
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send {batches.length > 0 ? `${batches.length} Batch${batches.length !== 1 ? 'es' : ''}` : 'to All'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Batch Progress Visualization */}
              {batches.length > 0 && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <span>📦</span>
                      Batch Progress
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {batches.filter(b => b.status === 'completed').length} / {batches.length} batches completed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {batches.map((batch, index) => (
                      <div
                        key={batch.id}
                        className={`border rounded-lg p-4 transition-all duration-300 ${batch.status === 'completed'
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-500'
                          : batch.status === 'sending'
                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 animate-pulse'
                            : batch.status === 'failed'
                              ? 'bg-red-50 dark:bg-red-950/30 border-red-500'
                              : 'bg-muted/50 border-border'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-sm">Batch {batch.id}</h5>
                          {batch.status === 'completed' && (
                            <CheckCircle2 className="h-5 w-5 text-green-600 animate-in fade-in zoom-in duration-300" />
                          )}
                          {batch.status === 'sending' && (
                            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                          )}
                          {batch.status === 'pending' && (
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            {batch.contacts.length} contact{batch.contacts.length !== 1 ? 's' : ''}
                            {batch.contacts.some(c => c.name.includes('🧪 Test')) && ' (incl. test)'}
                          </p>
                          {batch.status === 'completed' && batch.results.length > 0 && (
                            <p className="text-green-600 font-medium">
                              ✓ {batch.results.filter(r => r.success).length} sent,
                              ✗ {batch.results.filter(r => !r.success).length} failed
                            </p>
                          )}
                          {batch.status === 'sending' && (
                            <div className="space-y-2">
                              <p className="text-blue-600 font-medium animate-pulse">
                                Sending {currentContactInBatch}/{totalContactsInCurrentBatch}
                              </p>
                              {/* Mini progress bar for current batch */}
                              <div className="w-full bg-blue-200 dark:bg-blue-900/30 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${totalContactsInCurrentBatch > 0 ? (currentContactInBatch / totalContactsInCurrentBatch) * 100 : 0}%`
                                  }}
                                />
                              </div>
                              {batch.results.length > 0 && (
                                <p className="text-xs">
                                  ✓ {batch.results.filter(r => r.success).length} sent so far
                                </p>
                              )}
                            </div>
                          )}
                          {batch.status === 'pending' && index === currentBatchIndex + 1 && batchDelay > 0 && (
                            <p className="text-yellow-600 font-medium">
                              Waiting {batchDelay}s before start...
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Overall Progress Bar */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          const completedBatches = batches.filter(b => b.status === 'completed').length;
                          const totalBatches = batches.length;
                          const currentBatchProgress = isSending && currentBatchIndex >= 0 && totalContactsInCurrentBatch > 0
                            ? currentContactInBatch / totalContactsInCurrentBatch
                            : 0;
                          const overallProgress = ((completedBatches + currentBatchProgress) / totalBatches) * 100;
                          return Math.round(overallProgress);
                        })()}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${(() => {
                            const completedBatches = batches.filter(b => b.status === 'completed').length;
                            const totalBatches = batches.length;
                            const currentBatchProgress = isSending && currentBatchIndex >= 0 && totalContactsInCurrentBatch > 0
                              ? currentContactInBatch / totalContactsInCurrentBatch
                              : 0;
                            const overallProgress = ((completedBatches + currentBatchProgress) / totalBatches) * 100;
                            return overallProgress;
                          })()}%`
                        }}
                      />
                    </div>
                    {isSending && currentBatchIndex >= 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Processing batch {currentBatchIndex + 1} of {batches.length} • {sendResults.length} messages sent total
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Send Results */}
              {sendResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Sending Progress</h4>
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Phone</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sendResults.map((result, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{result.contact.name}</td>
                            <td className="p-2 font-mono text-xs">{result.contact.phone_number}</td>
                            <td className="p-2">
                              {result.success ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Sent
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600" title={result.error}>
                                  <XCircle className="h-3 w-3" />
                                  Failed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm p-3 bg-muted/30 rounded">
                    <span className="text-green-600 font-medium">
                      ✓ {sendResults.filter(r => r.success).length} sent
                    </span>
                    <span className="text-red-600 font-medium">
                      ✗ {sendResults.filter(r => !r.success).length} failed
                    </span>
                    {isSending && (
                      <span className="text-muted-foreground">
                        {sendResults.length} / {validContactsCount}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Template Selector Modal */}
        {showTemplateSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center mt-0" style={{ marginTop: "0px" }}>
            <div className="bg-background rounded-lg shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
                <div>
                  <h2 className="text-xl font-semibold">Select Template</h2>
                  <p className="text-sm text-muted-foreground">Choose an approved template</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateSelector(false)}
                  className="p-2"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-6 border-b flex-shrink-0">
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    <span className="ml-3 text-muted-foreground">Loading templates...</span>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No templates found
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-sm">{template.name}</h3>
                            <p className="text-xs text-muted-foreground">{template.category}</p>
                          </div>
                          <span className="text-lg">{template.category_icon}</span>
                        </div>

                        {/* Show media header indicator */}
                        {hasMediaHeader(template).hasMedia && (
                          <div className="mb-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            {hasMediaHeader(template).format === 'IMAGE' && '📷'}
                            {hasMediaHeader(template).format === 'VIDEO' && '🎥'}
                            {hasMediaHeader(template).format === 'DOCUMENT' && '📄'}
                            <span>Requires {hasMediaHeader(template).format?.toLowerCase()} URL</span>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground mb-2">
                          {template.formatted_components.body?.text?.substring(0, 100)}
                          {template.formatted_components.body?.text &&
                            template.formatted_components.body.text.length > 100 ? '...' : ''}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${template.status_color}`}>
                            {template.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {extractVariables(template).all.length} variables
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" style={{ marginTop: "0px" }}>
            <div className="bg-background rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4 my-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Confirm Bulk Send</h3>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
                <p className="font-medium">You are about to send template messages:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                  <li><strong className="text-foreground">{validContactsCount}</strong> contacts</li>
                  <li>Template: <strong className="text-foreground">{selectedTemplate?.name}</strong></li>
                  {(mediaUrl || mediaId) && selectedTemplate && (
                    <li>
                      Media: <strong className="text-foreground">{hasMediaHeader(selectedTemplate).format}</strong>
                      <span className="text-xs ml-2">
                        ({mediaInputType === "url" ? "via URL" : "via Media ID"})
                      </span>
                    </li>
                  )}
                  {batches.length > 0 && (
                    <>
                      <li><strong className="text-foreground">{batches.length}</strong> batch{batches.length !== 1 ? 'es' : ''} of <strong>{batchSize}</strong> contacts each</li>
                      {batchDelay > 0 && (
                        <li><strong className="text-foreground">{batchDelay}</strong> second{batchDelay !== 1 ? 's' : ''} delay between batches</li>
                      )}
                      {includeSelfTest && testPhoneNumber && (
                        <li className="text-blue-600">
                          🧪 Test message included in each batch: <strong className="font-mono">{testPhoneNumber}</strong>
                        </li>
                      )}
                    </>
                  )}
                </ul>

                {batches.length > 1 && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 mt-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Estimated Duration:</strong> ~{Math.ceil((batches.length * batchSize) + (batches.length - 1) * batchDelay)} seconds
                      ({Math.ceil(((batches.length * batchSize) + (batches.length - 1) * batchDelay) / 60)} minutes)
                    </p>
                  </div>
                )}

                <p className="text-muted-foreground pt-2 text-xs">
                  Messages will be sent with proper delays to maintain deliverability and avoid rate limits.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkSend}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Confirm & Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}