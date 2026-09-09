import React, { useState, useEffect } from 'react';
import { Screen, Message, Memory } from './types';
import { LeftSidebar } from './components/LeftSidebar';
import { VoicePanel } from './components/VoicePanel';
import { ChatScreen } from './screens/ChatScreen';
import { MemoryScreen } from './screens/MemoryScreen';
import { VoiceScreen } from './screens/VoiceScreen';

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    sender: 'user',
    text: 'I finally started training for that half marathon.',
  },
  {
    id: 'msg-2',
    sender: 'ai',
    text: "That's great — how'd the first run feel?",
  },
  {
    id: 'msg-3',
    sender: 'user',
    text: "Rough. My knee's been bugging me since the injury in March.",
  },
  {
    id: 'msg-4',
    sender: 'ai',
    text: "Given that, maybe ease into mileage slower than the plan suggests. Want weekly check-ins on how it's holding up?",
    memoryRecall: 'remembered: knee injury — March',
  },
];

const INITIAL_MEMORIES: Memory[] = [
  {
    id: 'mem-1',
    text: 'Had a knee injury in March; affects running training pace.',
    updatedAt: 'Updated 2 days ago',
  },
  {
    id: 'mem-2',
    text: 'Prefers concise responses in the morning.',
    updatedAt: 'Updated 5 days ago',
  },
  {
    id: 'mem-3',
    text: 'Training for a half marathon — started this week.',
    updatedAt: 'Created today',
  },
];

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('chat');
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('companion_messages_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_MESSAGES;
      }
    }
    return INITIAL_MESSAGES;
  });

  const [memories, setMemories] = useState<Memory[]>(() => {
    const saved = localStorage.getItem('companion_memories_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_MEMORIES;
      }
    }
    return INITIAL_MEMORIES;
  });

  const [isAiTyping, setIsAiTyping] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('companion_messages_v2', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('companion_memories_v2', JSON.stringify(memories));
  }, [memories]);

  // "+ New Chat" clears conversation history but preserves all memories
  const handleNewChat = () => {
    const welcomeMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: "Hello again. I'm ready for our new conversation — I have your saved memories on hand.",
    };
    setMessages([welcomeMsg]);
    setCurrentScreen('chat');
  };

  const handleSendMessage = (text: string) => {
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAiTyping(true);

    setTimeout(() => {
      let aiReply = "I've noted that down.";
      let memoryRecall: string | undefined = undefined;
      const lower = text.toLowerCase();

      // Check existing memories for relevant recall
      const matchedMemory = memories.find((m) => {
        const words = m.text.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
        return words.some((word) => lower.includes(word));
      });

      if (matchedMemory) {
        memoryRecall = `remembered: ${matchedMemory.text.split(';')[0].slice(0, 32)}`;
      }

      if (lower.includes('knee') || lower.includes('pain') || lower.includes('hurt') || lower.includes('injury')) {
        memoryRecall = 'remembered: knee injury — March';
        aiReply = "Given your knee, ease into mileage slower than normal. Want to focus on low-impact recovery today?";
      } else if (lower.includes('morning') || lower.includes('wake up') || lower.includes('coffee') || lower.includes('matcha')) {
        memoryRecall = 'remembered: concise morning style';
        aiReply = 'Morning. Two quick items for today, or ready to jump straight in?';
      } else if (lower.includes('marathon') || lower.includes('mileage') || lower.includes('running') || lower.includes('training') || lower.includes('pace')) {
        memoryRecall = 'remembered: half marathon goal';
        aiReply = 'Pacing is key for the half marathon. How are the rest intervals holding up?';
      } else if (
        lower.startsWith('i am ') ||
        lower.startsWith("i'm ") ||
        lower.includes('i love') ||
        lower.includes('i prefer') ||
        lower.includes('my name is') ||
        lower.includes('i work at') ||
        lower.includes('allergic to')
      ) {
        // Automatically save new memory
        const cleanFact = text
          .replace(/^(i am|i'm|i love|i prefer|my name is|remember that)\s*/i, '')
          .trim();
        const newMemoryItem: Memory = {
          id: `mem-${Date.now()}`,
          text: cleanFact.charAt(0).toUpperCase() + cleanFact.slice(1),
          updatedAt: 'Created today',
        };
        setMemories((prev) => [newMemoryItem, ...prev]);
        aiReply = `I'll remember that for next time.`;
      } else {
        const genericReplies = [
          "I'm listening. Tell me more about what's on your mind.",
          "Got it. I'll keep that in mind as we talk.",
          "Thanks for sharing. I'll remember this for our future check-ins.",
        ];
        aiReply = genericReplies[Math.floor(Math.random() * genericReplies.length)];
      }

      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: aiReply,
        memoryRecall,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsAiTyping(false);
    }, 700);
  };

  const handleUpdateMemory = (id: string, newText: string) => {
    setMemories((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, text: newText, updatedAt: 'Updated today' } : m
      )
    );
  };

  const handleDeleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddMemory = (text: string) => {
    const newMemory: Memory = {
      id: `mem-${Date.now()}`,
      text,
      updatedAt: 'Created today',
    };
    setMemories((prev) => [newMemory, ...prev]);
  };

  const handleVoiceSpoken = (userText: string, aiReply: string, memoryRecall?: string) => {
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
    };
    const aiMsg: Message = {
      id: `msg-${Date.now() + 1}`,
      sender: 'ai',
      text: aiReply,
      memoryRecall,
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
  };

  return (
    <div className="h-screen w-screen bg-bg text-ink flex overflow-hidden font-sans">
      {/* 1. LEFT PANEL: Navigation, Logo, + New Chat, Memory summary */}
      <LeftSidebar
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
        onNewChat={handleNewChat}
        memories={memories}
        isOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* 2. CENTER PANEL: Main Conversation or Memory Bank */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-card border-r border-line relative overflow-hidden">
        {currentScreen === 'chat' && (
          <ChatScreen
            messages={messages}
            onSendMessage={handleSendMessage}
            onOpenVoice={() => setVoicePanelOpen(true)}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onToggleVoicePanel={() => setVoicePanelOpen(!voicePanelOpen)}
            isAiTyping={isAiTyping}
          />
        )}

        {currentScreen === 'memory' && (
          <MemoryScreen
            memories={memories}
            onUpdateMemory={handleUpdateMemory}
            onDeleteMemory={handleDeleteMemory}
            onAddMemory={handleAddMemory}
            onBackToChat={() => setCurrentScreen('chat')}
          />
        )}

        {currentScreen === 'voice' && (
          <VoiceScreen
            onSwitchToText={() => setCurrentScreen('chat')}
            onVoiceSpoken={handleVoiceSpoken}
          />
        )}
      </main>

      {/* 3. RIGHT PANEL: Dedicated Voice Section with glowing orb & waveform */}
      <VoicePanel
        onVoiceSpoken={handleVoiceSpoken}
        isOpen={voicePanelOpen}
        onCloseMobile={() => setVoicePanelOpen(false)}
      />
    </div>
  );
};

export default App;
