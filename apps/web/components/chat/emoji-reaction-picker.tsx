"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Smile, ThumbsUp, Heart, Dog, Utensils, Trophy, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmojiReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  anchorPosition?: "top" | "bottom";
  className?: string;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  emojis: Array<{ char: string; keywords: string[] }>;
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    name: "Smileys & Emotion",
    icon: Smile,
    emojis: [
      { char: "😀", keywords: ["grinning", "happy", "smile", "face"] },
      { char: "😃", keywords: ["smiley", "happy", "joy"] },
      { char: "😄", keywords: ["smile", "happy", "joy", "laugh"] },
      { char: "😁", keywords: ["grin", "happy", "smile"] },
      { char: "😆", keywords: ["laughing", "satisfied", "haha"] },
      { char: "😅", keywords: ["sweat_smile", "hot", "nervous"] },
      { char: "😂", keywords: ["joy", "tears", "laugh", "funny", "lmao"] },
      { char: "🤣", keywords: ["rofl", "rolling", "laugh", "hilarious"] },
      { char: "🥲", keywords: ["smiling_face_with_tear", "grateful", "sad_happy"] },
      { char: "☺️", keywords: ["relaxed", "blush", "smile"] },
      { char: "😊", keywords: ["blush", "proud", "friendly"] },
      { char: "😇", keywords: ["innocent", "angel", "halo"] },
      { char: "🙂", keywords: ["slight_smile", "content"] },
      { char: "🙃", keywords: ["upside_down", "sarcasm", "silly"] },
      { char: "😉", keywords: ["wink", "flirt"] },
      { char: "😌", keywords: ["relieved", "calm", "zen"] },
      { char: "😍", keywords: ["heart_eyes", "love", "crush"] },
      { char: "🥰", keywords: ["smiling_face_with_hearts", "adore"] },
      { char: "😘", keywords: ["kissing_heart", "kisses", "love"] },
      { char: "😗", keywords: ["kissing", "pucker"] },
      { char: "😙", keywords: ["kissing_smiling_eyes"] },
      { char: "😚", keywords: ["kissing_closed_eyes"] },
      { char: "😋", keywords: ["yum", "tasty", "delicious"] },
      { char: "😛", keywords: ["stuck_out_tongue", "silly"] },
      { char: "😝", keywords: ["stuck_out_tongue_closed_eyes"] },
      { char: "😜", keywords: ["stuck_out_tongue_winking_eye", "party"] },
      { char: "🤪", keywords: ["zany_face", "crazy", "wild"] },
      { char: "🤨", keywords: ["raised_eyebrow", "skeptical", "suspicious"] },
      { char: "🧐", keywords: ["monocle", "curious", "investigate"] },
      { char: "🤓", keywords: ["nerd_face", "geek", "smart"] },
      { char: "😎", keywords: ["sunglasses", "cool", "boss"] },
      { char: "🥸", keywords: ["disguise", "incognito"] },
      { char: "🤩", keywords: ["star_struck", "excited", "wow"] },
      { char: "🥳", keywords: ["partying_face", "celebration", "birthday"] },
      { char: "😏", keywords: ["smirk", "clever"] },
      { char: "😒", keywords: ["unamused", "meh", "bored"] },
      { char: "😞", keywords: ["disappointed", "sad"] },
      { char: "😔", keywords: ["pensive", "regret"] },
      { char: "😟", keywords: ["worried", "nervous"] },
      { char: "😕", keywords: ["confused", "puzzled"] },
      { char: "🙁", keywords: ["slightly_frowning_face"] },
      { char: "☹️", keywords: ["frowning_face", "unhappy"] },
      { char: "😣", keywords: ["persevere", "struggling"] },
      { char: "😖", keywords: ["confounded", "frustrated"] },
      { char: "😫", keywords: ["tired_face", "exhausted"] },
      { char: "😩", keywords: ["weary", "stressed"] },
      { char: "🥺", keywords: ["pleading_face", "begging", "puppy_eyes"] },
      { char: "😢", keywords: ["cry", "tear", "sad"] },
      { char: "😭", keywords: ["sob", "crying", "tears", "overwhelmed"] },
      { char: "😮‍💨", keywords: ["face_exhaling", "relief", "sigh"] },
      { char: "😤", keywords: ["triumph", "proud", "steaming"] },
      { char: "😠", keywords: ["angry", "mad", "annoyed"] },
      { char: "😡", keywords: ["rage", "pout", "furious"] },
      { char: "🤬", keywords: ["cursing", "swearing", "censored"] },
      { char: "🤯", keywords: ["exploding_head", "mind_blown", "shocked"] },
      { char: "😳", keywords: ["flushed", "embarrassed", "gasp"] },
      { char: "🥵", keywords: ["hot_face", "sweating", "spicy"] },
      { char: "🥶", keywords: ["cold_face", "freezing", "ice"] },
      { char: "😱", keywords: ["scream", "horror", "shocked"] },
      { char: "😨", keywords: ["fearful", "scared"] },
      { char: "😰", keywords: ["cold_sweat", "anxious"] },
      { char: "😥", keywords: ["disappointed_relieved"] },
      { char: "😓", keywords: ["sweat", "phew"] },
      { char: "🤔", keywords: ["thinking", "ponder", "hmm"] },
      { char: "🤫", keywords: ["shushing_face", "quiet", "secret"] },
      { char: "🥱", keywords: ["yawning", "sleepy", "bored"] },
      { char: "😴", keywords: ["sleeping", "zzz", "goodnight"] },
      { char: "🤤", keywords: ["drooling", "craving"] },
      { char: "😵", keywords: ["dizzy", "knocked_out"] },
      { char: "🤐", keywords: ["zipper_mouth", "silent"] },
      { char: "🥴", keywords: ["woozy", "tipsy", "drunk"] },
      { char: "🤢", keywords: ["nauseated", "gross", "sick"] },
      { char: "🤮", keywords: ["vomit", "barf", "disgusted"] },
      { char: "🤧", keywords: ["sneezing", "allergy", "cold"] },
      { char: "😷", keywords: ["mask", "sick", "covid"] },
      { char: "🤒", keywords: ["thermometer", "fever"] },
      { char: "🤕", keywords: ["head_bandage", "hurt", "injured"] },
      { char: "🤑", keywords: ["money_face", "rich", "cash"] },
      { char: "🤠", keywords: ["cowboy", "hat"] },
    ],
  },
  {
    id: "gestures",
    name: "Gestures & People",
    icon: ThumbsUp,
    emojis: [
      { char: "👍", keywords: ["thumbsup", "like", "agree", "yes", "good", "ok"] },
      { char: "👎", keywords: ["thumbsdown", "dislike", "no", "bad"] },
      { char: "👌", keywords: ["ok_hand", "perfect", "deal"] },
      { char: "🤌", keywords: ["pinched_fingers", "italian", "chef_kiss"] },
      { char: "✌️", keywords: ["peace", "victory", "two"] },
      { char: "🤞", keywords: ["crossed_fingers", "luck", "hope"] },
      { char: "🫰", keywords: ["hand_with_index_and_thumb_crossed", "kpop_heart"] },
      { char: "🤟", keywords: ["love_you_gesture", "rock"] },
      { char: "🤘", keywords: ["sign_of_the_horns", "metal", "rock_on"] },
      { char: "🤙", keywords: ["call_me_hand", "hang_loose", "shaka"] },
      { char: "👈", keywords: ["point_left"] },
      { char: "👉", keywords: ["point_right"] },
      { char: "👆", keywords: ["point_up"] },
      { char: "👇", keywords: ["point_down"] },
      { char: "☝️", keywords: ["point_up_one", "attention"] },
      { char: "✋", keywords: ["raised_hand", "stop", "high_five"] },
      { char: "🤚", keywords: ["raised_back_of_hand"] },
      { char: "🖐️", keywords: ["hand_splayed", "five"] },
      { char: "🖖", keywords: ["vulcan_salute", "spock"] },
      { char: "👋", keywords: ["wave", "hello", "goodbye", "hi"] },
      { char: "🤝", keywords: ["handshake", "agreement", "deal", "partner"] },
      { char: "🙏", keywords: ["pray", "thank_you", "please", "namaste", "gratitude"] },
      { char: "👏", keywords: ["clap", "applause", "bravo", "good_job"] },
      { char: "🙌", keywords: ["raised_hands", "hooray", "praise"] },
      { char: "🫶", keywords: ["heart_hands", "love", "care"] },
      { char: "👐", keywords: ["open_hands", "hug"] },
      { char: "🤲", keywords: ["palms_up_together"] },
      { char: "💪", keywords: ["muscle", "strong", "power", "gym", "flex"] },
      { char: "🦾", keywords: ["mechanical_arm", "robot"] },
      { char: "👀", keywords: ["eyes", "look", "see", "watching"] },
      { char: "👁️", keywords: ["eye"] },
      { char: "👅", keywords: ["tongue"] },
      { char: "👄", keywords: ["mouth", "lips"] },
      { char: "🔥", keywords: ["fire", "flame", "lit", "hot", "trending"] },
      { char: "✨", keywords: ["sparkles", "magic", "clean", "special"] },
      { char: "⭐", keywords: ["star", "favorite"] },
      { char: "🌟", keywords: ["glowing_star"] },
      { char: "💯", keywords: ["100", "score", "perfect", "keep_it_100"] },
      { char: "🎯", keywords: ["bullseye", "target", "accurate"] },
    ],
  },
  {
    id: "hearts",
    name: "Hearts & Love",
    icon: Heart,
    emojis: [
      { char: "❤️", keywords: ["red_heart", "love", "like"] },
      { char: "🧡", keywords: ["orange_heart"] },
      { char: "💛", keywords: ["yellow_heart"] },
      { char: "💚", keywords: ["green_heart"] },
      { char: "💙", keywords: ["blue_heart"] },
      { char: "💜", keywords: ["purple_heart"] },
      { char: "🖤", keywords: ["black_heart"] },
      { char: "🤍", keywords: ["white_heart"] },
      { char: "🤎", keywords: ["brown_heart"] },
      { char: "💔", keywords: ["broken_heart", "heartbreak"] },
      { char: "❤️‍🔥", keywords: ["heart_on_fire", "passion"] },
      { char: "❤️‍🩹", keywords: ["mending_heart", "healing"] },
      { char: "❣️", keywords: ["heart_exclamation"] },
      { char: "💕", keywords: ["two_hearts"] },
      { char: "💞", keywords: ["revolving_hearts"] },
      { char: "💓", keywords: ["beating_heart"] },
      { char: "💗", keywords: ["growing_heart"] },
      { char: "💖", keywords: ["sparkling_heart"] },
      { char: "💘", keywords: ["cupid_heart"] },
      { char: "💝", keywords: ["gift_heart"] },
      { char: "💌", keywords: ["love_letter"] },
    ],
  },
  {
    id: "nature",
    name: "Animals & Nature",
    icon: Dog,
    emojis: [
      { char: "🐶", keywords: ["dog", "puppy", "pet"] },
      { char: "🐱", keywords: ["cat", "kitten"] },
      { char: "🐭", keywords: ["mouse"] },
      { char: "🐹", keywords: ["hamster"] },
      { char: "🐰", keywords: ["rabbit", "bunny"] },
      { char: "🦊", keywords: ["fox"] },
      { char: "🐻", keywords: ["bear"] },
      { char: "🐼", keywords: ["panda"] },
      { char: "🐨", keywords: ["koala"] },
      { char: "🐯", keywords: ["tiger"] },
      { char: "🦁", keywords: ["lion", "brave"] },
      { char: "🐮", keywords: ["cow"] },
      { char: "🐷", keywords: ["pig"] },
      { char: "🐸", keywords: ["frog"] },
      { char: "🐵", keywords: ["monkey"] },
      { char: "🙈", keywords: ["see_no_evil"] },
      { char: "🙉", keywords: ["hear_no_evil"] },
      { char: "🙊", keywords: ["speak_no_evil"] },
      { char: "🦋", keywords: ["butterfly", "pretty"] },
      { char: "🐝", keywords: ["bee", "honey"] },
      { char: "🌸", keywords: ["cherry_blossom", "flower"] },
      { char: "🌹", keywords: ["rose", "romantic"] },
      { char: "🌻", keywords: ["sunflower"] },
      { char: "🍀", keywords: ["four_leaf_clover", "lucky"] },
      { char: "🌴", keywords: ["palm_tree", "tropical", "vacation"] },
      { char: "🌈", keywords: ["rainbow", "pride"] },
      { char: "☀️", keywords: ["sun", "sunny", "morning"] },
      { char: "🌙", keywords: ["crescent_moon", "night"] },
    ],
  },
  {
    id: "food",
    name: "Food & Drink",
    icon: Utensils,
    emojis: [
      { char: "☕", keywords: ["coffee", "tea", "caffeine"] },
      { char: "🍵", keywords: ["matcha", "green_tea"] },
      { char: "🧋", keywords: ["boba", "bubble_tea"] },
      { char: "🍺", keywords: ["beer", "cheers", "drink"] },
      { char: "🍻", keywords: ["clinking_beers", "celebrate"] },
      { char: "🥂", keywords: ["champagne", "toast", "congrats"] },
      { char: "🍷", keywords: ["wine"] },
      { char: "🍕", keywords: ["pizza", "food", "cheese"] },
      { char: "🍔", keywords: ["burger", "fast_food"] },
      { char: "🍟", keywords: ["fries"] },
      { char: "🌮", keywords: ["taco", "mexican"] },
      { char: "🌯", keywords: ["burrito"] },
      { char: "🍜", keywords: ["ramen", "noodles"] },
      { char: "🍣", keywords: ["sushi", "japanese"] },
      { char: "🍰", keywords: ["cake", "dessert", "sweet"] },
      { char: "🎂", keywords: ["birthday_cake"] },
      { char: "🍦", keywords: ["ice_cream"] },
      { char: "🍿", keywords: ["popcorn", "movie"] },
    ],
  },
  {
    id: "activities",
    name: "Activities & Objects",
    icon: Trophy,
    emojis: [
      { char: "🎉", keywords: ["tada", "party", "celebrate", "congrats"] },
      { char: "🎊", keywords: ["confetti_ball"] },
      { char: "🎈", keywords: ["balloon"] },
      { char: "🎁", keywords: ["gift", "present"] },
      { char: "🏆", keywords: ["trophy", "winner", "first_place"] },
      { char: "🥇", keywords: ["1st_place_medal", "gold"] },
      { char: "⚽", keywords: ["soccer", "football"] },
      { char: "🏀", keywords: ["basketball"] },
      { char: "🎮", keywords: ["video_game", "gaming"] },
      { char: "📱", keywords: ["phone", "mobile", "whatsapp"] },
      { char: "💻", keywords: ["laptop", "computer", "code"] },
      { char: "💡", keywords: ["light_bulb", "idea", "creative"] },
      { char: "💰", keywords: ["money_bag", "cash", "wealth"] },
      { char: "💵", keywords: ["dollar_bill"] },
      { char: "🚀", keywords: ["rocket", "launch", "fast", "moon"] },
      { char: "⏰", keywords: ["alarm_clock", "time"] },
      { char: "🔔", keywords: ["bell", "notification"] },
    ],
  },
  {
    id: "symbols",
    name: "Symbols",
    icon: Compass,
    emojis: [
      { char: "✅", keywords: ["check_mark", "done", "yes", "completed"] },
      { char: "✔️", keywords: ["heavy_check_mark"] },
      { char: "☑️", keywords: ["ballot_box_with_check"] },
      { char: "❌", keywords: ["cross_mark", "no", "cancel"] },
      { char: "⚠️", keywords: ["warning", "alert"] },
      { char: "⛔", keywords: ["no_entry"] },
      { char: "🚫", keywords: ["prohibited"] },
      { char: "❓", keywords: ["question_mark", "what"] },
      { char: "❗", keywords: ["exclamation_mark"] },
      { char: "💬", keywords: ["speech_bubble", "chat", "message"] },
      { char: "💭", keywords: ["thought_bubble"] },
      { char: "💤", keywords: ["zzz", "sleeping"] },
      { char: "🛑", keywords: ["stop_sign"] },
      { char: "➕", keywords: ["plus"] },
      { char: "➖", keywords: ["minus"] },
      { char: "✖️", keywords: ["multiply"] },
      { char: "➗", keywords: ["divide"] },
    ],
  },
];

export function EmojiReactionPicker({
  isOpen,
  onClose,
  onSelectEmoji,
  anchorPosition = "top",
  className,
}: EmojiReactionPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>("smileys");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    // Focus search input after modal opens
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filter emojis based on search term
  const filteredEmojis = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return null;

    const results: Array<{ char: string; keywords: string[] }> = [];
    const seen = new Set<string>();

    for (const cat of EMOJI_CATEGORIES) {
      for (const emoji of cat.emojis) {
        if (!seen.has(emoji.char)) {
          const matchesChar = emoji.char.includes(term);
          const matchesKeyword = emoji.keywords.some((kw) => kw.toLowerCase().includes(term));
          if (matchesChar || matchesKeyword) {
            seen.add(emoji.char);
            results.push(emoji);
          }
        }
      }
    }

    return results;
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute z-50 w-72 sm:w-80 bg-background border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-fade-in text-foreground",
        anchorPosition === "top" ? "bottom-full mb-2" : "top-full mt-2",
        className
      )}
      style={{ maxHeight: "380px" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Header */}
      <div className="p-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground ml-1" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search emojis..."
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="p-1 text-muted-foreground hover:text-foreground rounded-full"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-full"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category Icons Bar (hidden during active search) */}
      {!searchTerm && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/20 text-muted-foreground">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                title={cat.name}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                    : "hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="p-2.5 overflow-y-auto flex-1 max-h-[260px] scrollbar-thin">
        {filteredEmojis !== null ? (
          // Search results
          filteredEmojis.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No emojis found for "{searchTerm}"
            </div>
          ) : (
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Search Results ({filteredEmojis.length})
              </div>
              <div className="grid grid-cols-7 gap-1">
                {filteredEmojis.map((emoji) => (
                  <button
                    key={emoji.char}
                    type="button"
                    onClick={() => {
                      onSelectEmoji(emoji.char);
                      onClose();
                    }}
                    className="h-9 w-9 flex items-center justify-center text-xl rounded-lg hover:bg-muted active:scale-90 transition-transform select-none"
                    title={emoji.keywords[0]}
                  >
                    {emoji.char}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          // Selected category view
          <div>
            {EMOJI_CATEGORIES.filter((c) => c.id === activeCategory).map((cat) => (
              <div key={cat.id}>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {cat.name}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji.char}
                      type="button"
                      onClick={() => {
                        onSelectEmoji(emoji.char);
                        onClose();
                      }}
                      className="h-9 w-9 flex items-center justify-center text-xl rounded-lg hover:bg-muted active:scale-90 transition-transform select-none"
                      title={emoji.keywords[0]}
                    >
                      {emoji.char}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmojiReactionPicker;
