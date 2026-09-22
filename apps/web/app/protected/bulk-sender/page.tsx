"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster, toast } from "@/components/ui/toast";
import LogoIcon from "@/components/logo-icon";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  Loader2,
  Send,
  Users,
  MessageSquareText,
  XCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  Video,
  Hash,
  Clock,
  AlertTriangle,
  RotateCcw,
  Search,
  Check,
  ShieldCheck,
  Calendar,
  X,
  User,
  Phone,
  UserPlus,
} from "lucide-react";

interface Contact {
  name: string;
  phone_number: string;
  isValid: boolean;
  error?: string;
  country?: string;
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
    footer: {},
  });
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [mediaId, setMediaId] = useState<string>("");
  const [mediaInputType, setMediaInputType] = useState<"url" | "id">("url");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [resultsFilter, setResultsFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");

  // Batch configuration
  const [batchSize, setBatchSize] = useState<number>(10);
  const [batchDelay, setBatchDelay] = useState<number>(5); // seconds
  const [batches, setBatches] = useState<
    Array<{
      id: number;
      contacts: Contact[];
      status: "pending" | "sending" | "completed" | "failed";
      results: SendResult[];
    }>
  >([]);
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

  // Country-specific phone validation rules based on ITU-T E.164
  // Sorted with longest country codes first so prefixes are matched accurately
  const COUNTRY_PHONE_RULES = [
    // 3-digit country codes
    { country: "United Arab Emirates", code: "971", minNationalDigits: 8, maxNationalDigits: 9, example: "971501234567" },
    { country: "Saudi Arabia", code: "966", minNationalDigits: 9, maxNationalDigits: 9, example: "966501234567" },
    { country: "Hong Kong", code: "852", minNationalDigits: 8, maxNationalDigits: 8, example: "85291234567" },
    { country: "Taiwan", code: "886", minNationalDigits: 8, maxNationalDigits: 9, example: "886912345678" },
    { country: "Ireland", code: "353", minNationalDigits: 8, maxNationalDigits: 9, example: "353871234567" },
    { country: "Portugal", code: "351", minNationalDigits: 9, maxNationalDigits: 9, example: "351912345678" },
    { country: "Finland", code: "358", minNationalDigits: 7, maxNationalDigits: 10, example: "358401234567" },
    { country: "Nepal", code: "977", minNationalDigits: 10, maxNationalDigits: 10, example: "9779812345678" },
    { country: "Bangladesh", code: "880", minNationalDigits: 10, maxNationalDigits: 10, example: "8801712345678" },
    { country: "Qatar", code: "974", minNationalDigits: 8, maxNationalDigits: 8, example: "97433123456" },
    { country: "Kuwait", code: "965", minNationalDigits: 8, maxNationalDigits: 8, example: "96591234567" },
    { country: "Oman", code: "968", minNationalDigits: 8, maxNationalDigits: 8, example: "96891234567" },
    { country: "Bahrain", code: "973", minNationalDigits: 8, maxNationalDigits: 8, example: "97339123456" },
    { country: "Nigeria", code: "234", minNationalDigits: 10, maxNationalDigits: 10, example: "2348012345678" },
    { country: "Kenya", code: "254", minNationalDigits: 9, maxNationalDigits: 9, example: "254712345678" },
    { country: "Ghana", code: "233", minNationalDigits: 9, maxNationalDigits: 9, example: "233241234567" },
    { country: "Israel", code: "972", minNationalDigits: 8, maxNationalDigits: 9, example: "972501234567" },

    // 2-digit country codes
    { country: "New Zealand", code: "64", minNationalDigits: 8, maxNationalDigits: 9, example: "6448888202 or 6421123456" },
    { country: "Australia", code: "61", minNationalDigits: 9, maxNationalDigits: 9, example: "61412345678" },
    { country: "Singapore", code: "65", minNationalDigits: 8, maxNationalDigits: 8, example: "6581234567" },
    { country: "United Kingdom", code: "44", minNationalDigits: 9, maxNationalDigits: 10, example: "447911123456" },
    { country: "India", code: "91", minNationalDigits: 10, maxNationalDigits: 10, example: "919876543210" },
    { country: "Germany", code: "49", minNationalDigits: 7, maxNationalDigits: 12, example: "4915123456789" },
    { country: "France", code: "33", minNationalDigits: 9, maxNationalDigits: 9, example: "33612345678" },
    { country: "Spain", code: "34", minNationalDigits: 9, maxNationalDigits: 9, example: "34612345678" },
    { country: "Italy", code: "39", minNationalDigits: 9, maxNationalDigits: 11, example: "393123456789" },
    { country: "China", code: "86", minNationalDigits: 10, maxNationalDigits: 11, example: "8613912345678" },
    { country: "Japan", code: "81", minNationalDigits: 9, maxNationalDigits: 10, example: "819012345678" },
    { country: "South Korea", code: "82", minNationalDigits: 8, maxNationalDigits: 10, example: "821012345678" },
    { country: "Brazil", code: "55", minNationalDigits: 10, maxNationalDigits: 11, example: "5511912345678" },
    { country: "Mexico", code: "52", minNationalDigits: 10, maxNationalDigits: 10, example: "525512345678" },
    { country: "South Africa", code: "27", minNationalDigits: 9, maxNationalDigits: 9, example: "27821234567" },
    { country: "Pakistan", code: "92", minNationalDigits: 10, maxNationalDigits: 10, example: "923001234567" },
    { country: "Indonesia", code: "62", minNationalDigits: 9, maxNationalDigits: 12, example: "628123456789" },
    { country: "Malaysia", code: "60", minNationalDigits: 8, maxNationalDigits: 10, example: "60123456789" },
    { country: "Philippines", code: "63", minNationalDigits: 10, maxNationalDigits: 10, example: "639171234567" },
    { country: "Vietnam", code: "84", minNationalDigits: 9, maxNationalDigits: 10, example: "84901234567" },
    { country: "Thailand", code: "66", minNationalDigits: 8, maxNationalDigits: 9, example: "66812345678" },
    { country: "Netherlands", code: "31", minNationalDigits: 9, maxNationalDigits: 9, example: "31612345678" },
    { country: "Belgium", code: "32", minNationalDigits: 8, maxNationalDigits: 9, example: "32470123456" },
    { country: "Switzerland", code: "41", minNationalDigits: 9, maxNationalDigits: 9, example: "41791234567" },
    { country: "Austria", code: "43", minNationalDigits: 8, maxNationalDigits: 12, example: "436641234567" },
    { country: "Sweden", code: "46", minNationalDigits: 8, maxNationalDigits: 10, example: "46701234567" },
    { country: "Norway", code: "47", minNationalDigits: 8, maxNationalDigits: 8, example: "4741234567" },
    { country: "Denmark", code: "45", minNationalDigits: 8, maxNationalDigits: 8, example: "4520123456" },
    { country: "Poland", code: "48", minNationalDigits: 9, maxNationalDigits: 9, example: "48501234567" },
    { country: "Greece", code: "30", minNationalDigits: 10, maxNationalDigits: 10, example: "306912345678" },
    { country: "Turkey", code: "90", minNationalDigits: 10, maxNationalDigits: 10, example: "905321234567" },
    { country: "Egypt", code: "20", minNationalDigits: 9, maxNationalDigits: 10, example: "201012345678" },
    { country: "Sri Lanka", code: "94", minNationalDigits: 9, maxNationalDigits: 9, example: "94712345678" },
    { country: "Argentina", code: "54", minNationalDigits: 10, maxNationalDigits: 11, example: "5491112345678" },
    { country: "Chile", code: "56", minNationalDigits: 9, maxNationalDigits: 9, example: "56912345678" },
    { country: "Colombia", code: "57", minNationalDigits: 10, maxNationalDigits: 10, example: "573001234567" },
    { country: "Peru", code: "51", minNationalDigits: 9, maxNationalDigits: 9, example: "51912345678" },

    // 1-digit country codes
    { country: "United States / Canada", code: "1", minNationalDigits: 10, maxNationalDigits: 10, example: "14155552671" },
  ];

  const validatePhoneNumber = (
    phone: string
  ): { isValid: boolean; error?: string; country?: string; formatted?: string } => {
    if (!phone || typeof phone !== "string") {
      return { isValid: false, error: "Phone number is required" };
    }

    // 1. Normalize: remove spaces, dashes, parentheses, dots
    let clean = phone.trim().replace(/[\s\-\(\)\.]/g, "");

    // 2. Remove leading + or 00 international exit code
    if (clean.startsWith("+")) {
      clean = clean.substring(1);
    } else if (clean.startsWith("00")) {
      clean = clean.substring(2);
    }

    // 3. Must only contain digits
    if (!/^\d+$/.test(clean)) {
      return {
        isValid: false,
        error: "Phone number must contain only numeric digits",
      };
    }

    // 4. International ITU-T E.164 bounds (7 to 15 digits total)
    if (clean.length < 7) {
      return {
        isValid: false,
        error: `Phone number is too short (${clean.length} digits). Minimum 7 digits with country code required.`,
      };
    }

    if (clean.length > 15) {
      return {
        isValid: false,
        error: `Phone number is too long (${clean.length} digits). Maximum 15 digits allowed under E.164.`,
      };
    }

    // 5. Match against country code rules (sorted longest code first)
    const matchedRule = COUNTRY_PHONE_RULES.find((rule) => clean.startsWith(rule.code));

    if (matchedRule) {
      let nationalNumber = clean.substring(matchedRule.code.length);

      // Auto-strip domestic trunk zero (e.g., +64 04 888 8202 -> 6448888202)
      if (
        nationalNumber.startsWith("0") &&
        nationalNumber.length - 1 >= matchedRule.minNationalDigits &&
        nationalNumber.length - 1 <= matchedRule.maxNationalDigits
      ) {
        nationalNumber = nationalNumber.substring(1);
        clean = matchedRule.code + nationalNumber;
      }

      const nationalLength = nationalNumber.length;

      if (nationalLength < matchedRule.minNationalDigits) {
        return {
          isValid: false,
          error: `${matchedRule.country} (+${matchedRule.code}) requires at least ${matchedRule.minNationalDigits} digits after country code. Found ${nationalLength}. (e.g. ${matchedRule.example})`,
          country: matchedRule.country,
          formatted: clean,
        };
      }

      if (nationalLength > matchedRule.maxNationalDigits) {
        return {
          isValid: false,
          error: `${matchedRule.country} (+${matchedRule.code}) cannot exceed ${matchedRule.maxNationalDigits} digits after country code. Found ${nationalLength}. (e.g. ${matchedRule.example})`,
          country: matchedRule.country,
          formatted: clean,
        };
      }

      return {
        isValid: true,
        country: matchedRule.country,
        formatted: clean,
      };
    }

    // 6. Generic fallback for other valid ITU E.164 countries
    return {
      isValid: true,
      country: "International",
      formatted: clean,
    };
  };

  const getQualityInfo = (
    template: WhatsAppTemplate
  ): { rating: string; limit: number; color: string } => {
    const qualityScore = template.quality_score as Record<string, unknown> | undefined;
    const rating = (qualityScore?.score as string) || "UNKNOWN";

    let limit = 1000;
    let color = "text-stone-600 dark:text-stone-400";

    switch (rating.toUpperCase()) {
      case "HIGH":
        limit = 100000;
        color = "text-[#2D583F] dark:text-emerald-400";
        break;
      case "MEDIUM":
        limit = 10000;
        color = "text-amber-600 dark:text-amber-400";
        break;
      case "LOW":
        limit = 1000;
        color = "text-orange-600 dark:text-orange-400";
        break;
      case "PENDING":
      case "FLAGGED":
        limit = 250;
        color = "text-red-600 dark:text-red-400";
        break;
      default:
        limit = 1000;
        color = "text-stone-600 dark:text-stone-400";
    }

    return { rating, limit, color };
  };

  const createBatches = (validContacts: Contact[]): void => {
    const batchesArray = [];
    const contactsToProcess = [...validContacts];

    if (includeSelfTest && testPhoneNumber) {
      const validation = validatePhoneNumber(testPhoneNumber);
      if (validation.isValid) {
        const testContact: Contact = {
          name: "🧪 Test (You)",
          phone_number: testPhoneNumber.replace(/\s+/g, "").replace(/[^\d]/g, ""),
          isValid: true,
        };

        for (let i = 0; i < contactsToProcess.length; i += batchSize) {
          const batchContacts = contactsToProcess.slice(i, i + batchSize);
          batchesArray.push({
            id: batchesArray.length + 1,
            contacts: [testContact, ...batchContacts],
            status: "pending" as const,
            results: [],
          });
        }
      } else {
        toast("Invalid test phone number format. Skipping self-test.", "warning");
        for (let i = 0; i < contactsToProcess.length; i += batchSize) {
          batchesArray.push({
            id: batchesArray.length + 1,
            contacts: contactsToProcess.slice(i, i + batchSize),
            status: "pending" as const,
            results: [],
          });
        }
      }
    } else {
      for (let i = 0; i < contactsToProcess.length; i += batchSize) {
        batchesArray.push({
          id: batchesArray.length + 1,
          contacts: contactsToProcess.slice(i, i + batchSize),
          status: "pending" as const,
          results: [],
        });
      }
    }

    setBatches(batchesArray);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setContacts([]);
    setSelectedTemplate(null);
    setSendResults([]);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          toast("CSV file must contain at least a header row and one data row", "error");
          setIsProcessing(false);
          setSelectedFile(null);
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const nameIndex = headers.findIndex((h) => h === "name");
        const phoneIndex = headers.findIndex((h) => h === "phone_number" || h === "phone");

        if (nameIndex === -1 || phoneIndex === -1) {
          toast('CSV must contain "name" and "phone_number" columns', "error");
          setIsProcessing(false);
          setSelectedFile(null);
          return;
        }

        const parsedContacts: Contact[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          if (values.length < 2) continue;

          const name = values[nameIndex] || "";
          const phone = values[phoneIndex] || "";
          if (!name && !phone) continue;

          const validation = validatePhoneNumber(phone);
          const cleanPhone = validation.formatted || phone.replace(/\s+/g, "").replace(/[^\d]/g, "");

          parsedContacts.push({
            name,
            phone_number: cleanPhone,
            isValid: validation.isValid,
            error: validation.error,
            country: validation.country,
          });
        }

        if (parsedContacts.length === 0) {
          toast("No valid contacts found in CSV file", "error");
          setIsProcessing(false);
          setSelectedFile(null);
          return;
        }

        setContacts(parsedContacts);
        setIsProcessing(false);

        const validCount = parsedContacts.filter((c) => c.isValid).length;
        const invalidCount = parsedContacts.length - validCount;

        if (invalidCount > 0) {
          toast(
            `Processed ${parsedContacts.length} contacts: ${validCount} valid, ${invalidCount} invalid. Please review invalid contacts.`,
            "warning",
            7000
          );
        } else {
          toast(`✓ Successfully processed ${validCount} valid contacts`, "success");
        }
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast("Failed to parse CSV file. Please check the format.", "error");
        setIsProcessing(false);
        setSelectedFile(null);
      }
    };

    reader.onerror = () => {
      toast("Failed to read file", "error");
      setIsProcessing(false);
      setSelectedFile(null);
    };

    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "name,phone_number\r\n" +
      "Aryan Shinde,918828316840\r\n" +
      "John Doe,14155552671\r\n" +
      "Priya Sharma,919876543210\r\n" +
      "Sarah Connor,447911123456\r\n" +
      "Michael Scott,12125550198\r\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bulk-message-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("Downloaded sample CSV template", "success");
  };

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);

    try {
      const response = await fetch("/api/templates?status=APPROVED");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to fetch templates");
      }

      setTemplates(result.data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast(`Failed to load templates: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSelectTemplate = () => {
    setShowTemplateSelector(true);
    fetchTemplates();
  };

  const hasMediaHeader = (template: WhatsAppTemplate): { hasMedia: boolean; format?: string } => {
    const headerComponent = template.components?.find((c) => c.type === "HEADER");
    const hasMedia =
      headerComponent?.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format.toUpperCase());
    return { hasMedia: !!hasMedia, format: headerComponent?.format };
  };

  const extractVariables = (
    template: WhatsAppTemplate
  ): {
    header: string[];
    body: string[];
    footer: string[];
    all: string[];
  } => {
    const headerVariables: string[] = [];
    const bodyVariables: string[] = [];
    const footerVariables: string[] = [];

    template.components?.forEach((component) => {
      if (component.text) {
        const matches = component.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          const componentVariables = matches.map((match) => match.replace(/[{}]/g, ""));

          switch (component.type) {
            case "HEADER":
              componentVariables.forEach((v) => {
                if (!headerVariables.includes(v)) headerVariables.push(v);
              });
              break;
            case "BODY":
              componentVariables.forEach((v) => {
                if (!bodyVariables.includes(v)) bodyVariables.push(v);
              });
              break;
            case "FOOTER":
              componentVariables.forEach((v) => {
                if (!footerVariables.includes(v)) footerVariables.push(v);
              });
              break;
          }
        }
      }
    });

    headerVariables.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    bodyVariables.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    footerVariables.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    const allVariables = Array.from(new Set([...headerVariables, ...bodyVariables, ...footerVariables])).sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10)
    );

    return {
      header: headerVariables,
      body: bodyVariables,
      footer: footerVariables,
      all: allVariables,
    };
  };

  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);

    setVariables({
      header: {},
      body: {},
      footer: {},
    });
    setMediaUrl("");
    setMediaId("");
    setMediaInputType("url");

    const qualityInfo = getQualityInfo(template);
    setTemplateQuality({
      rating: qualityInfo.rating,
      limit: qualityInfo.limit,
    });

    setBatches([]);
    setCurrentBatchIndex(-1);
    setSendResults([]);
  };

  const handleAddContact = () => {
    if (!newContactName.trim()) {
      toast("Please enter a contact name", "warning");
      return;
    }
    if (!newContactPhone.trim()) {
      toast("Please enter a phone number", "warning");
      return;
    }

    const validation = validatePhoneNumber(newContactPhone);
    const cleanPhone = validation.formatted || newContactPhone.replace(/\s+/g, "").replace(/[^\d]/g, "");

    if (contacts.some((c) => c.phone_number === cleanPhone)) {
      toast("This phone number already exists in the list", "warning");
      return;
    }

    const newContact: Contact = {
      name: newContactName.trim(),
      phone_number: cleanPhone,
      isValid: validation.isValid,
      error: validation.error,
      country: validation.country,
    };

    setContacts([...contacts, newContact]);
    setNewContactName("");
    setNewContactPhone("");
    setShowAddContact(false);

    if (validation.isValid) {
      toast(`✓ Added ${newContact.name} (${validation.country || "Valid format"})`, "success");
    } else {
      toast(`Contact added with warning: ${validation.error}`, "warning", 8000);
    }
  };

  const handleDeleteContact = (index: number) => {
    const contact = contacts[index];
    setContacts(contacts.filter((_, i) => i !== index));
    toast(`Removed ${contact.name} from the list`, "info");
  };

  const handleConfirmSend = () => {
    if (!selectedTemplate) {
      toast("Please select a template first", "warning");
      return;
    }

    const validContacts = contacts
      .map((c) => {
        const v = validatePhoneNumber(c.phone_number);
        return {
          ...c,
          phone_number: v.formatted || c.phone_number,
          isValid: c.isValid || v.isValid,
          error: v.error || c.error,
          country: v.country || c.country,
        };
      })
      .filter((c) => c.isValid);

    if (validContacts.length === 0) {
      toast("No valid contacts to send messages to", "warning");
      return;
    }

    const mediaHeader = hasMediaHeader(selectedTemplate);
    if (mediaHeader.hasMedia) {
      if (!mediaUrl.trim() && !mediaId.trim()) {
        toast(`Please provide either a ${mediaHeader.format?.toLowerCase()} URL or Media ID for the header`, "warning");
        return;
      }

      if (mediaUrl.trim()) {
        try {
          const url = new URL(mediaUrl);
          if (!url.protocol.startsWith("https")) {
            toast("Media URL must use HTTPS protocol", "error");
            return;
          }
        } catch {
          toast("Please provide a valid HTTPS URL for the media", "error");
          return;
        }
      }

      if (mediaId.trim() && !/^\d+$/.test(mediaId)) {
        toast("Media ID must be a numeric value", "error");
        return;
      }
    }

    const templateVars = extractVariables(selectedTemplate);
    const missingVars: string[] = [];

    templateVars.header.forEach((v) => {
      if (!variables.header[v]?.trim()) missingVars.push(`Header {{${v}}}`);
    });
    templateVars.body.forEach((v) => {
      if (!variables.body[v]?.trim()) missingVars.push(`Body {{${v}}}`);
    });
    templateVars.footer.forEach((v) => {
      if (!variables.footer[v]?.trim()) missingVars.push(`Footer {{${v}}}`);
    });

    if (missingVars.length > 0) {
      toast(`Please fill in all variables: ${missingVars.join(", ")}`, "warning", 7000);
      return;
    }

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

    createBatches(validContacts);
    setShowConfirmation(true);
  };

  const handleBulkSend = async () => {
    if (!selectedTemplate || batches.length === 0) return;

    setShowConfirmation(false);
    setIsSending(true);
    setSendResults([]);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      setCurrentBatchIndex(batchIndex);
      const batch = batches[batchIndex];
      setTotalContactsInCurrentBatch(batch.contacts.length);
      setCurrentContactInBatch(0);

      setBatches((prev) =>
        prev.map((b, idx) => (idx === batchIndex ? { ...b, status: "sending" as const } : b))
      );

      const batchResults: SendResult[] = [];

      for (let contactIndex = 0; contactIndex < batch.contacts.length; contactIndex++) {
        const contact = batch.contacts[contactIndex];
        setCurrentContactInBatch(contactIndex + 1);

        try {
          const templateLang =
            selectedTemplate.language === "en"
              ? "en_US"
              : selectedTemplate.language || "en_US";

          const response = await fetch("/api/send-template", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: contact.phone_number,
              contactName: contact.name,
              templateName: selectedTemplate.name,
              templateData: {
                ...selectedTemplate,
                language: templateLang,
              },
              variables: variables,
              mediaUrl: mediaUrl || undefined,
              mediaId: mediaId || undefined,
            }),
          });

          const result = await response.json();

          if (response.ok) {
            batchResults.push({
              contact,
              success: true,
              messageId: result.messageId,
            });
          } else {
            batchResults.push({
              contact,
              success: false,
              error: result.error || result.message || "Failed to send",
            });
          }
        } catch (error) {
          batchResults.push({
            contact,
            success: false,
            error: error instanceof Error ? error.message : "Network error",
          });
        }

        setBatches((prev) =>
          prev.map((b, idx) => (idx === batchIndex ? { ...b, results: [...batchResults] } : b))
        );

        setSendResults((prev) => {
          const newResults = [...prev];
          const existingIndex = newResults.findIndex((r) => r.contact.phone_number === contact.phone_number);
          if (existingIndex >= 0) {
            newResults[existingIndex] = batchResults[batchResults.length - 1];
          } else {
            newResults.push(batchResults[batchResults.length - 1]);
          }
          return newResults;
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setBatches((prev) =>
        prev.map((b, idx) =>
          idx === batchIndex
            ? {
                ...b,
                status: "completed" as const,
                results: batchResults,
              }
            : b
        )
      );

      setCurrentContactInBatch(0);

      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, batchDelay * 1000));
      }
    }

    setIsSending(false);
    setCurrentBatchIndex(-1);
    setCurrentContactInBatch(0);
    setTotalContactsInCurrentBatch(0);

    const allResults = batches.flatMap((b) => b.results);
    const successCount = allResults.filter((r) => r.success).length;
    const failCount = allResults.length - successCount;

    if (failCount === 0) {
      toast(
        `✓ Successfully sent messages to all ${successCount} contacts across ${batches.length} batch${batches.length !== 1 ? "es" : ""}!`,
        "success",
        8000
      );
    } else {
      toast(
        `Bulk send completed! ${successCount} sent successfully, ${failCount} failed. Check the results for details.`,
        "warning",
        10000
      );
    }
  };

  const handleExportResults = () => {
    if (sendResults.length === 0) return;
    const headers = "Name,Phone Number,Status,Message ID,Error\n";
    const rows = sendResults
      .map(
        (r) =>
          `"${r.contact.name}","${r.contact.phone_number}","${r.success ? "SENT" : "FAILED"}","${r.messageId || ""}","${(r.error || "").replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bulk-broadcast-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validContactsCount = contacts.filter((c) => c.isValid || validatePhoneNumber(c.phone_number).isValid).length;
  const invalidContactsCount = contacts.length - validContactsCount;
  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedContacts = contacts.filter(
    (c) =>
      !contactSearch.trim() ||
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone_number.includes(contactSearch)
  );

  const displayedResults = sendResults.filter((r) => {
    if (resultsFilter === "SUCCESS") return r.success;
    if (resultsFilter === "FAILED") return !r.success;
    return true;
  });

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0C0F0D] text-stone-800 dark:text-stone-200 flex flex-col">
      <Toaster />

      {/* Main Full-Width Responsive Canvas matching templates, media, setup, api-keys */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-20">
        {/* ======================================================================= */}
        {/* HEADER SECTION - Editorial Botanical Typography & Action                */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 mb-2.5">
              <LogoIcon className="size-3.5 text-[#5F7C65]" />
              <span>High-Throughput Campaign Engine &amp; Broadcast Dispatcher</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-100">
              Bulk{" "}
              <span className="font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]">
                Broadcast
              </span>{" "}
              Sender
            </h1>
            <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Dispatch personalized WhatsApp template campaigns to customer lists with automatic batch rate-limiting, delivery self-testing, and real-time telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 sm:pt-1 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="h-9 sm:h-10 px-3.5 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-white/80 dark:bg-stone-900/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Download className="size-3.5 text-[#5F7C65]" />
              <span>Sample CSV</span>
            </Button>

            {contacts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setContacts([]);
                  setSelectedFile(null);
                  setSelectedTemplate(null);
                  setBatches([]);
                  setSendResults([]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  toast("Recipient workspace reset", "info");
                }}
                className="h-9 sm:h-10 px-3 rounded-xl text-xs text-stone-500 hover:text-red-600 dark:hover:text-red-400 gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset List</span>
              </Button>
            )}
          </div>
        </div>

        {/* Step 1: Upload Contact List */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
          <div className="rounded-[calc(1.5rem-0.125rem)] bg-[#FAF8F5]/60 dark:bg-stone-950/40 p-5 sm:p-7 space-y-6">
            {/* Step Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#2D583F] text-white font-mono font-bold text-xs flex items-center justify-center shadow-2xs">
                  01
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                    Recipient List & Contacts Staging
                  </h2>
                  <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                    Import recipient phone numbers via CSV or manually append individual target contacts.
                  </p>
                </div>
              </div>

              {contacts.length > 0 && (
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#2D583F] dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 font-semibold">
                    {validContactsCount} Valid
                  </span>
                  {invalidContactsCount > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/80 font-semibold">
                      {invalidContactsCount} Invalid
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CSV Dropzone / Upload Area */}
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-stone-300/80 dark:border-stone-700/80 hover:border-[#5F7C65] p-8 text-center bg-white/50 dark:bg-stone-900/40 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="size-12 rounded-2xl bg-[#5F7C65]/10 dark:bg-[#5F7C65]/20 text-[#5F7C65] flex items-center justify-center mx-auto transition-transform group-hover:scale-105">
                    {isProcessing ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                      {isProcessing ? "Processing recipient records..." : "Click or drag CSV contact file here"}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Supports comma, semicolon, or tab-delimited CSV with <code className="font-mono text-stone-700 dark:text-stone-300">name</code> and <code className="font-mono text-stone-700 dark:text-stone-300">phone_number</code> columns.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-[#5F7C65]/12 text-[#5F7C65] flex items-center justify-center">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-stone-500 font-mono">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {contacts.length} rows detected
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3 rounded-xl text-xs border-stone-300 dark:border-stone-700"
                    >
                      Replace CSV
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setContacts([]);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="size-8 p-0 rounded-xl text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!selectedFile && !showAddContact && (
                <div className="flex items-center justify-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowAddContact(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-[#2D583F] dark:hover:text-[#8EAE95] transition-colors cursor-pointer"
                  >
                    <UserPlus className="size-3.5 text-[#5F7C65]" />
                    <span>Or manually enter individual recipients</span>
                  </button>
                </div>
              )}

              {/* Add Single Contact Inline Form */}
              {showAddContact && (
                <div className="rounded-2xl border border-[#5F7C65]/30 dark:border-[#5F7C65]/25 bg-white/95 dark:bg-stone-900/90 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)] p-5 sm:p-6 space-y-5 my-3.5 animate-in fade-in duration-200">
                  {/* Form Header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/70 dark:border-stone-800/70">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#5F7C65] dark:text-[#8EAE95] flex items-center justify-center shrink-0">
                        <UserPlus className="size-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                          Add Individual Recipient
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          Manually append a contact to the broadcast dispatch staging list.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddContact(false);
                        setNewContactName("");
                        setNewContactPhone("");
                      }}
                      className="size-8 p-0 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                      title="Close form"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  {/* Form Input Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact_name" className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                        <span>Recipient Name</span>
                        <span className="text-[#5F7C65] font-bold">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                        <Input
                          id="contact_name"
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          placeholder="e.g. Sarah Jenkins"
                          className="h-10 pl-10 pr-3.5 text-xs sm:text-sm rounded-xl border-stone-300 dark:border-stone-700 bg-[#FAF8F5]/60 dark:bg-stone-950/60 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-[#5F7C65] focus-visible:border-[#5F7C65] transition-all"
                          onKeyDown={(e) => e.key === "Enter" && handleAddContact()}
                        />
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Full customer or organization name.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="contact_phone" className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                        <span>Phone Number</span>
                        <span className="text-[#5F7C65] font-bold">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                        <Input
                          id="contact_phone"
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                          placeholder="e.g. 919876543210"
                          className="h-10 pl-10 pr-3.5 text-xs sm:text-sm font-mono rounded-xl border-stone-300 dark:border-stone-700 bg-[#FAF8F5]/60 dark:bg-stone-950/60 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-[#5F7C65] focus-visible:border-[#5F7C65] transition-all"
                          onKeyDown={(e) => e.key === "Enter" && handleAddContact()}
                        />
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                        Include country code without &apos;+&apos; or spaces (e.g. 919876543210).
                      </p>
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200/70 dark:border-stone-800/70">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddContact(false);
                        setNewContactName("");
                        setNewContactPhone("");
                      }}
                      className="h-9 px-4 rounded-xl text-xs font-medium border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddContact}
                      className="h-9 px-4 rounded-xl text-xs font-medium bg-[#5F7C65] hover:bg-[#526D57] text-white shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),inset_0_-1px_2px_0_rgba(0,0,0,0.18)] transition-all active:scale-[0.98] gap-1.5 cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Recipient</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Contacts Table */}
              {contacts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400 pointer-events-none" />
                      <Input
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Filter contacts..."
                        className="h-9 pl-9 text-xs rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      />
                    </div>

                    {!showAddContact && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddContact(true)}
                        className="h-9 px-3.5 rounded-xl text-xs font-medium border-stone-300 dark:border-stone-700 hover:border-[#5F7C65]/50 bg-white/80 dark:bg-stone-900/80 hover:bg-[#5F7C65]/10 text-stone-800 dark:text-stone-200 gap-1.5 self-start sm:self-auto shadow-2xs transition-all cursor-pointer"
                      >
                        <UserPlus className="size-3.5 text-[#5F7C65]" />
                        <span>Add Single Contact</span>
                      </Button>
                    )}
                  </div>

                  <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 overflow-hidden shadow-2xs">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100/80 dark:bg-stone-950/80 text-stone-600 dark:text-stone-400 font-mono uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-stone-200/80 dark:border-stone-800/80">
                          <tr>
                            <th className="py-2.5 px-4">Recipient Name</th>
                            <th className="py-2.5 px-4">Phone Number</th>
                            <th className="py-2.5 px-4">Verification</th>
                            <th className="py-2.5 px-4 text-right">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200/60 dark:divide-stone-800/60 font-sans">
                          {displayedContacts.map((contact, index) => {
                            const validation = validatePhoneNumber(contact.phone_number);
                            const isContactValid = contact.isValid || validation.isValid;
                            const countryName = contact.country || validation.country;
                            const displayError = contact.error || validation.error;

                            return (
                              <tr key={index} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors">
                                <td className="py-2.5 px-4 font-medium text-stone-900 dark:text-stone-100">
                                  {contact.name}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-stone-700 dark:text-stone-300">
                                  +{validation.formatted || contact.phone_number}
                                </td>
                                <td className="py-2.5 px-4">
                                  {isContactValid ? (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                                      <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                                      <span>Valid</span>
                                      {countryName && countryName !== "International" && (
                                        <span className="text-stone-500 dark:text-stone-400 font-sans text-[10px] font-normal">
                                          ({countryName})
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 text-[11px] font-mono text-red-600 dark:text-red-400 font-medium cursor-help"
                                      title={displayError}
                                    >
                                      <XCircle className="size-3 text-red-500 shrink-0" />
                                      <span>Invalid format</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteContact(index)}
                                    className="size-7 p-0 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Select WhatsApp Template */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
          <div className="rounded-[calc(1.5rem-0.125rem)] bg-[#FAF8F5]/60 dark:bg-stone-950/40 p-5 sm:p-7 space-y-6">
            {/* Step Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#2D583F] text-white font-mono font-bold text-xs flex items-center justify-center shadow-2xs">
                  02
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                    Template & Parameter Mapping
                  </h2>
                  <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                    Select an approved WhatsApp template and map dynamic variables or media attachments.
                  </p>
                </div>
              </div>

              {selectedTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectTemplate}
                  className="h-8 px-3 rounded-xl text-xs border-stone-300 dark:border-stone-700 gap-1.5 text-stone-700 dark:text-stone-300 cursor-pointer"
                >
                  <MessageSquareText className="size-3.5 text-[#5F7C65]" />
                  <span>Change Template</span>
                </Button>
              )}
            </div>

            {/* Template Selection Trigger or Card */}
            {!selectedTemplate ? (
              <div className="p-8 text-center space-y-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/50 dark:bg-stone-900/40">
                <div className="size-12 rounded-2xl bg-[#5F7C65]/10 text-[#5F7C65] flex items-center justify-center mx-auto">
                  <MessageSquareText className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    No Template Chosen
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                    {contacts.length === 0
                      ? "First add contacts in Step 1 to unlock template selection."
                      : "Choose one of your approved Meta WhatsApp Cloud API templates to dispatch."}
                  </p>
                </div>
                <Button
                  onClick={handleSelectTemplate}
                  disabled={contacts.length === 0 || validContactsCount === 0}
                  className="h-9 px-4 rounded-xl text-xs bg-[#2D583F] hover:bg-[#244732] text-white font-medium gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <MessageSquareText className="size-3.5" />
                  <span>Browse Approved Templates</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Selected Template Header Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 flex items-start justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-2xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-xl flex items-center justify-center shrink-0">
                      {selectedTemplate.category_icon || "💬"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base text-stone-900 dark:text-stone-100 font-mono truncate">
                          {selectedTemplate.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-[#2D583F] border border-emerald-200/80">
                          APPROVED
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 font-mono mt-0.5">
                        {selectedTemplate.category} • {selectedTemplate.language}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-stone-500">
                      {extractVariables(selectedTemplate).all.length} Variable{extractVariables(selectedTemplate).all.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Message Bubble Preview */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-stone-950/80 border border-stone-200/70 dark:border-stone-800/70 space-y-2 font-sans">
                  {selectedTemplate.formatted_components?.header?.text && (
                    <p className="font-bold text-xs text-stone-900 dark:text-stone-100">
                      {selectedTemplate.formatted_components.header.text}
                    </p>
                  )}
                  {selectedTemplate.formatted_components?.body?.text && (
                    <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                      {selectedTemplate.formatted_components.body.text}
                    </p>
                  )}
                  {selectedTemplate.formatted_components?.footer?.text && (
                    <p className="text-[10px] text-stone-500 italic pt-1 border-t border-stone-200/60 dark:border-stone-800/60">
                      {selectedTemplate.formatted_components.footer.text}
                    </p>
                  )}
                </div>

                {/* Media Header Configuration */}
                {hasMediaHeader(selectedTemplate).hasMedia && (
                  <div className="rounded-2xl border border-[#5F7C65]/30 bg-white/90 dark:bg-stone-900/90 p-4.5 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-[#5F7C65]/12 text-[#5F7C65] flex items-center justify-center">
                        {hasMediaHeader(selectedTemplate).format === "IMAGE" ? (
                          <ImageIcon className="size-4" />
                        ) : hasMediaHeader(selectedTemplate).format === "VIDEO" ? (
                          <Video className="size-4" />
                        ) : (
                          <FileText className="size-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 font-mono uppercase tracking-wider">
                          {hasMediaHeader(selectedTemplate).format} Header Attachment Required *
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          Attach a media file from your workspace library or specify a Meta Media ID.
                        </p>
                      </div>
                    </div>

                    {/* Method Switcher */}
                    <div className="flex gap-2 max-w-xs">
                      <Button
                        type="button"
                        size="sm"
                        variant={mediaInputType === "url" ? "default" : "outline"}
                        onClick={() => setMediaInputType("url")}
                        className={`flex-1 h-8 rounded-xl text-xs font-mono ${
                          mediaInputType === "url" ? "bg-[#2D583F] text-white" : "border-stone-300 dark:border-stone-700"
                        }`}
                      >
                        Media Library
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mediaInputType === "id" ? "default" : "outline"}
                        onClick={() => setMediaInputType("id")}
                        className={`flex-1 h-8 rounded-xl text-xs font-mono ${
                          mediaInputType === "id" ? "bg-[#2D583F] text-white" : "border-stone-300 dark:border-stone-700"
                        }`}
                      >
                        Meta Media ID
                      </Button>
                    </div>

                    {mediaInputType === "url" ? (
                      <div className="space-y-2">
                        {mediaUrl ? (
                          <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-stone-200/80 dark:border-stone-800/80">
                            <ImageIcon className="size-5 text-[#2D583F] shrink-0" />
                            <span className="text-xs font-mono truncate flex-1 text-stone-800 dark:text-stone-200">
                              {mediaUrl.split("/").pop()?.split("?")[0] || "Selected attachment"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMediaUrl("")}
                              className="size-7 p-0 rounded-lg text-stone-400 hover:text-red-600"
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMediaPickerOpen(true)}
                            className="w-full h-9 rounded-xl border-dashed border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:border-[#5F7C65] gap-2"
                          >
                            <ImageIcon className="size-3.5 text-[#5F7C65]" />
                            <span>Select {hasMediaHeader(selectedTemplate).format?.toLowerCase()} from Media Library</span>
                          </Button>
                        )}
                        <MediaPickerDialog
                          isOpen={mediaPickerOpen}
                          onClose={() => setMediaPickerOpen(false)}
                          onSelect={(media) => {
                            setMediaUrl(media.url);
                            setMediaId("");
                            setMediaPickerOpen(false);
                          }}
                          mediaTypeFilter={
                            hasMediaHeader(selectedTemplate).format === "IMAGE"
                              ? "image"
                              : hasMediaHeader(selectedTemplate).format === "VIDEO"
                              ? "video"
                              : hasMediaHeader(selectedTemplate).format === "DOCUMENT"
                              ? "document"
                              : undefined
                          }
                          title={`Select ${hasMediaHeader(selectedTemplate).format?.toLowerCase()} header`}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label htmlFor="media_id" className="text-xs font-mono text-stone-700 dark:text-stone-300">
                          Meta Graph Media ID *
                        </Label>
                        <Input
                          id="media_id"
                          value={mediaId}
                          onChange={(e) => {
                            setMediaId(e.target.value);
                            setMediaUrl("");
                          }}
                          placeholder="e.g. 123456789012345"
                          className="h-9 text-xs font-mono rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Variable Inputs Mapper */}
                {extractVariables(selectedTemplate).all.length > 0 && (
                  <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/90 p-4.5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                        <Hash className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 font-mono uppercase tracking-wider">
                          Dynamic Variable Values *
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          Provide fallback or batch values for each parameter tag in the message.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {extractVariables(selectedTemplate).body.map((v) => (
                        <div key={`body-${v}`} className="space-y-1">
                          <Label htmlFor={`var-${v}`} className="text-xs font-mono text-stone-700 dark:text-stone-300">
                            Parameter &#123;&#123;{v}&#125;&#125; *
                          </Label>
                          <Input
                            id={`var-${v}`}
                            value={variables.body[v] || ""}
                            onChange={(e) =>
                              setVariables((prev) => ({
                                ...prev,
                                body: { ...prev.body, [v]: e.target.value },
                              }))
                            }
                            placeholder={`Value for {{${v}}}`}
                            className="h-9 text-xs rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Template Health & Limits Bento */}
                {templateQuality && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400">Quality Rating</span>
                        <p className={`text-sm font-bold font-mono mt-0.5 ${getQualityInfo(selectedTemplate).color}`}>
                          {templateQuality.rating} QUALITY
                        </p>
                      </div>
                      <ShieldCheck className="size-5 text-stone-400" />
                    </div>

                    <div className="p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400">Daily Recipient Quota</span>
                        <p className="text-sm font-bold font-mono mt-0.5 text-[#2D583F] dark:text-emerald-300">
                          {templateQuality.limit.toLocaleString()} / day
                        </p>
                      </div>
                      <Calendar className="size-5 text-stone-400" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Batch Configuration & Self Testing */}
        {selectedTemplate && validContactsCount > 0 && (
          <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
            <div className="rounded-[calc(1.5rem-0.125rem)] bg-[#FAF8F5]/60 dark:bg-stone-950/40 p-5 sm:p-7 space-y-6">
              {/* Step Header */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-[#2D583F] text-white font-mono font-bold text-xs flex items-center justify-center shadow-2xs">
                    03
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                      Batch Rate-Limiting & Quality Controls
                    </h2>
                    <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                      Configure throughput chunking to maintain Meta sender reputation and avoid rate blocks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="batch_size" className="text-xs font-mono text-stone-700 dark:text-stone-300">
                    Contacts Per Batch *
                  </Label>
                  <Input
                    id="batch_size"
                    type="number"
                    min="1"
                    max={validContactsCount}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value, 10) || 10))}
                    className="h-9 text-xs rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
                  />
                  <p className="text-[11px] text-stone-400">Recommended: 10–25 contacts per burst</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="batch_delay" className="text-xs font-mono text-stone-700 dark:text-stone-300">
                    Pause Duration Between Batches (seconds) *
                  </Label>
                  <Input
                    id="batch_delay"
                    type="number"
                    min="0"
                    max="3600"
                    value={batchDelay}
                    onChange={(e) => setBatchDelay(Math.max(0, parseInt(e.target.value, 10) || 5))}
                    className="h-9 text-xs rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono"
                  />
                  <p className="text-[11px] text-stone-400">Pause window allows handsets to receive without spam flags</p>
                </div>
              </div>

              {/* Batch Forecast Pill */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 text-xs font-mono text-stone-600 dark:text-stone-300 flex items-center justify-between">
                <span>Calculated Plan:</span>
                <strong className="text-stone-900 dark:text-stone-100">
                  {Math.ceil(validContactsCount / batchSize)} Batch{Math.ceil(validContactsCount / batchSize) !== 1 ? "es" : ""} • ~{batchDelay}s delay (Est. ~{Math.ceil(((Math.ceil(validContactsCount / batchSize) * batchSize) + (Math.ceil(validContactsCount / batchSize) - 1) * batchDelay) / 60)} mins)
                </strong>
              </div>

              {/* Self-Testing Option */}
              <div className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 space-y-3">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="self_test_toggle"
                    checked={includeSelfTest}
                    onChange={(e) => setIncludeSelfTest(e.target.checked)}
                    className="size-4 rounded border-stone-300 text-[#2D583F] focus:ring-[#2D583F]"
                  />
                  <Label htmlFor="self_test_toggle" className="text-xs font-semibold text-stone-900 dark:text-stone-100 cursor-pointer">
                    🧪 Include testing handset in each batch (Delivery Verification)
                  </Label>
                </div>

                {includeSelfTest && (
                  <div className="pl-6 space-y-2 pt-1 animate-in fade-in duration-200">
                    <Label htmlFor="test_number" className="text-xs font-mono text-stone-600 dark:text-stone-400">
                      Your Verification Phone Number (e.g. 919876543210) *
                    </Label>
                    <Input
                      id="test_number"
                      type="tel"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      placeholder="919876543210"
                      className="h-9 text-xs font-mono rounded-xl border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 max-w-sm"
                    />
                    <p className="text-[11px] text-stone-500">
                      Your number will receive the exact template payload alongside each batch to verify real-time handset delivery.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Dispatch Execution & Telemetry */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]">
          <div className="rounded-[calc(1.5rem-0.125rem)] bg-[#FAF8F5]/60 dark:bg-stone-950/40 p-5 sm:p-7 space-y-6">
            {/* Step Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#2D583F] text-white font-mono font-bold text-xs flex items-center justify-center shadow-2xs">
                  04
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                    Campaign Dispatch & Telemetry
                  </h2>
                  <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                    Review pre-flight conditions, start broadcast, and monitor live delivery progression.
                  </p>
                </div>
              </div>
            </div>

            {/* Pre-Flight Summary Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 shadow-2xs">
              <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Users className="size-4 text-[#5F7C65]" />
                  <span>{validContactsCount} Recipients Ready</span>
                </div>
                {selectedTemplate && (
                  <div className="flex items-center gap-1.5">
                    <MessageSquareText className="size-4 text-stone-400" />
                    <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedTemplate.name}</span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleConfirmSend}
                disabled={!selectedTemplate || validContactsCount === 0 || isSending}
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#2D583F] hover:bg-[#244732] text-white shadow-2xs gap-2 transition-colors cursor-pointer disabled:opacity-50 self-end sm:self-auto shrink-0"
              >
                {isSending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>
                      Sending {currentContactInBatch}/{totalContactsInCurrentBatch} (Batch {currentBatchIndex + 1}/{batches.length})
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    <span>
                      Dispatch {batches.length > 0 ? `${batches.length} Batches` : `to ${validContactsCount} Recipients`}
                    </span>
                  </>
                )}
              </Button>
            </div>

            {/* Overall Progress Meter */}
            {batches.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-stone-800 dark:text-stone-200">Overall Campaign Progress</span>
                    <span className="text-stone-500">
                      {(() => {
                        const completed = batches.filter((b) => b.status === "completed").length;
                        const total = batches.length;
                        const currentProgress =
                          isSending && currentBatchIndex >= 0 && totalContactsInCurrentBatch > 0
                            ? currentContactInBatch / totalContactsInCurrentBatch
                            : 0;
                        return Math.round(((completed + currentProgress) / total) * 100);
                      })()}% Complete
                    </span>
                  </div>

                  <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#2D583F] h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${(() => {
                          const completed = batches.filter((b) => b.status === "completed").length;
                          const total = batches.length;
                          const currentProgress =
                            isSending && currentBatchIndex >= 0 && totalContactsInCurrentBatch > 0
                              ? currentContactInBatch / totalContactsInCurrentBatch
                              : 0;
                          return ((completed + currentProgress) / total) * 100;
                        })()}%`,
                      }}
                    />
                  </div>

                  {isSending && currentBatchIndex >= 0 && (
                    <p className="text-[11px] font-mono text-stone-500">
                      Processing batch {currentBatchIndex + 1} of {batches.length} • {sendResults.length} messages dispatched total
                    </p>
                  )}
                </div>

                {/* Batches Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {batches.map((batch, index) => (
                    <div
                      key={batch.id}
                      className={`p-3.5 rounded-2xl border transition-all text-xs ${
                        batch.status === "completed"
                          ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                          : batch.status === "sending"
                          ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                          : "bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                          Batch {batch.id}
                        </span>
                        {batch.status === "completed" && <Check className="size-4 text-[#2D583F]" />}
                        {batch.status === "sending" && <Loader2 className="size-4 text-amber-600 animate-spin" />}
                        {batch.status === "pending" && <Clock className="size-4 text-stone-400" />}
                      </div>

                      <p className="text-[11px] text-stone-500 font-mono">
                        {batch.contacts.length} recipients
                      </p>

                      {batch.status === "completed" && (
                        <p className="text-[11px] font-mono font-semibold text-[#2D583F] mt-1">
                          ✓ {batch.results.filter((r) => r.success).length} sent, {batch.results.filter((r) => !r.success).length} failed
                        </p>
                      )}

                      {batch.status === "pending" && index === currentBatchIndex + 1 && batchDelay > 0 && (
                        <p className="text-[11px] font-mono text-amber-700 dark:text-amber-400 mt-1">
                          Pausing {batchDelay}s before start...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results Table & Export */}
            {sendResults.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-stone-200/60 dark:border-stone-800/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 font-mono uppercase tracking-wider">
                      Live Delivery Feed ({sendResults.length})
                    </span>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-[10px] font-mono">
                      {(["ALL", "SUCCESS", "FAILED"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setResultsFilter(tab)}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            resultsFilter === tab
                              ? "bg-white dark:bg-stone-900 font-bold text-stone-900 dark:text-stone-100 shadow-2xs"
                              : "text-stone-500"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportResults}
                    className="h-8 px-3 rounded-xl text-xs border-stone-300 dark:border-stone-700 gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Download className="size-3.5 text-[#5F7C65]" />
                    <span>Export Telemetry (CSV)</span>
                  </Button>
                </div>

                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 overflow-hidden shadow-2xs">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-100/80 dark:bg-stone-950/80 text-stone-600 dark:text-stone-400 font-mono uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-stone-200/80 dark:border-stone-800/80">
                        <tr>
                          <th className="py-2.5 px-4">Recipient</th>
                          <th className="py-2.5 px-4">Phone Number</th>
                          <th className="py-2.5 px-4">Result</th>
                          <th className="py-2.5 px-4">Reference / Diagnostic</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200/60 dark:divide-stone-800/60 font-sans">
                        {displayedResults.map((res, index) => (
                          <tr key={index} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors">
                            <td className="py-2 px-4 font-medium text-stone-900 dark:text-stone-100">
                              {res.contact.name}
                            </td>
                            <td className="py-2 px-4 font-mono text-stone-700 dark:text-stone-300">
                              +{res.contact.phone_number}
                            </td>
                            <td className="py-2 px-4">
                              {res.success ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                                  <CheckCircle2 className="size-3 text-emerald-600" />
                                  Delivered
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-600 dark:text-red-400 font-semibold">
                                  <XCircle className="size-3 text-red-500" />
                                  Failed
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-4 font-mono text-[11px] text-stone-500 truncate max-w-xs">
                              {res.messageId ? `ID: ${res.messageId}` : res.error || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Template Selector */}
      {showTemplateSelector && (
        <div
          className="fixed inset-0 bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowTemplateSelector(false)}
        >
          <div
            className="bg-stone-50 dark:bg-[#121714] border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#5F7C65] flex items-center justify-center">
                  <MessageSquareText className="size-4" />
                </div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Select Approved WhatsApp Template
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateSelector(false)}
                className="size-7 p-0 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-4 border-b border-stone-200/60 dark:border-stone-800/60 bg-white/60 dark:bg-stone-900/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400 pointer-events-none" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search templates by name or category..."
                  className="h-9 pl-9 text-xs rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {isLoadingTemplates ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="size-7 animate-spin mx-auto text-[#5F7C65]" />
                  <p className="text-xs text-stone-500 font-mono">Querying approved templates...</p>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-16 text-center text-xs text-stone-500 font-mono">
                  No approved templates matched your query.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 hover:border-[#5F7C65] transition-all cursor-pointer shadow-2xs space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate group-hover:text-[#2D583F] transition-colors">
                            {template.name}
                          </h4>
                          <p className="text-[10px] font-mono text-stone-400 mt-0.5">
                            {template.category} • {template.language}
                          </p>
                        </div>
                        <span className="text-base">{template.category_icon || "💬"}</span>
                      </div>

                      {hasMediaHeader(template).hasMedia && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-mono text-[10px]">
                          {hasMediaHeader(template).format} Header
                        </div>
                      )}

                      <p className="text-[11px] text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
                        {template.formatted_components?.body?.text || "No preview"}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800 text-[10px] font-mono text-stone-400">
                        <span className="text-[#2D583F] font-semibold uppercase">{template.status}</span>
                        <span>{extractVariables(template).all.length} variables</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pre-Flight Dispatch Confirmation */}
      {showConfirmation && (
        <div
          className="fixed inset-0 bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowConfirmation(false)}
        >
          <div
            className="bg-stone-50 dark:bg-[#121714] border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="size-11 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="size-5" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Confirm Campaign Dispatch
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  You are about to broadcast messages to <strong className="text-stone-900 dark:text-stone-100">{validContactsCount}</strong> verified recipients via WhatsApp Cloud API.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 text-xs font-mono space-y-1.5 text-stone-700 dark:text-stone-300">
                <div className="flex justify-between">
                  <span>Template:</span>
                  <strong className="text-stone-900 dark:text-stone-100">{selectedTemplate?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Batch Chunks:</span>
                  <span>{batches.length} batches of {batchSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Pause:</span>
                  <span>{batchDelay}s between bursts</span>
                </div>
                {includeSelfTest && testPhoneNumber && (
                  <div className="flex justify-between text-blue-600">
                    <span>Self-Test:</span>
                    <span>+{testPhoneNumber}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmation(false)}
                className="h-9 px-4 rounded-xl text-xs border-stone-300 dark:border-stone-700"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBulkSend}
                className="h-9 px-4 rounded-xl text-xs bg-[#2D583F] hover:bg-[#244732] text-white font-semibold gap-1.5 shadow-2xs cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>Confirm & Dispatch</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}