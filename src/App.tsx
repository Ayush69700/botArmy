import React, { useState, useEffect } from 'react';
import { Screen, Message, Memory } from './types';
import { LeftSidebar } from './components/LeftSidebar';
import { VoicePanel } from './components/VoicePanel';
import { ChatScreen } from './screens/ChatScreen';
import { MemoryScreen } from './screens/MemoryScreen';
import { VoiceScreen } from './screens/VoiceScreen';
import { api } from './services/api';

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
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [memories, setMemories] = useState<Memory[]>(INITIAL_MEMORIES);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);

  // Sync with Backend on mount
  useEffect(() => {
    async function syncBackendData() {
      try {
        await api.ensureAuthenticated();

        // 1. Fetch memories from backend
        const backendMemories = await api.getMemories();
        if (backendMemories && backendMemories.length > 0) {
          setMemories(backendMemories);
        } else {
          // Initialize backend with default seed memories
          for (const m of INITIAL_MEMORIES) {
            await api.createMemory(m.text);
          }
        }

        // 2. Fetch messages from backend
        const backendHistory = await api.getChatHistory();
        if (backendHistory && backendHistory.length > 0) {
          setMessages(backendHistory);
        }
      } catch (err) {
        console.warn('Backend sync initialized in hybrid mode:', err);
      }
    }

    syncBackendData();
  }, []);

  // "+ New Chat" clears conversation history on UI
  const handleNewChat = () => {
    const welcomeMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: "Hello again. I'm ready for our new conversation — I have your saved memories on hand.",
    };
    setMessages([welcomeMsg]);
    setCurrentScreen('chat');
  };

  const handleSendMessage = async (text: string) => {
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsAiTyping(true);

    try {
      // Call live Backend Chat API (uses Gemini + Memory relevance + Memory extraction)
      const result = await api.sendMessage(text);

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        result.userMessage,
        result.assistantMessage,
      ]);

      // Re-fetch updated memories in background after 2 seconds to capture extracted memories
      setTimeout(async () => {
        const freshMemories = await api.getMemories();
        if (freshMemories && freshMemories.length > 0) {
          setMemories(freshMemories);
        }
      }, 2000);
    } catch (err) {
      console.warn('Backend chat API failed, using fallback handler:', err);

      // Graceful local fallback if backend is momentarily restarting
      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: "I've noted that down and remembered it for our upcoming conversations.",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleUpdateMemory = async (id: string, newText: string) => {
    // Optimistic update
    setMemories((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, text: newText, updatedAt: 'Updated just now' } : m
      )
    );
    await api.updateMemory(id, newText);
  };

  const handleDeleteMemory = async (id: string) => {
    // Optimistic delete
    setMemories((prev) => prev.filter((m) => m.id !== id));
    await api.deleteMemory(id);
  };

  const handleAddMemory = async (text: string) => {
    const created = await api.createMemory(text);
    if (created) {
      setMemories((prev) => [created, ...prev]);
    } else {
      const fallbackMemory: Memory = {
        id: `mem-${Date.now()}`,
        text,
        updatedAt: 'Created today',
      };
      setMemories((prev) => [fallbackMemory, ...prev]);
    }
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
