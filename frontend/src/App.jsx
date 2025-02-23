import { useState, useEffect, useRef } from "react";
import "prismjs/themes/prism-tomorrow.css";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-dark.css";
import axios from "axios";
import {
  ClipboardIcon,
  TrashIcon,
  PlusIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";
import Modal from "react-modal";

Modal.setAppElement("#root");

function App() {
  const [code, setCode] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState(
    () => JSON.parse(localStorage.getItem("chatHistory")) || []
  );
  const [isTyping, setIsTyping] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [showHomepage, setShowHomepage] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile sidebar
  const chatEndRef = useRef(null);

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Apply theme to the body
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Highlight code whenever messages change
  useEffect(() => {
    Prism.highlightAll();
  }, [messages]);

  // Scroll to the bottom of the chat when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Load messages for the active chat
  useEffect(() => {
    if (activeChat !== null) {
      const selectedChat = chatHistory.find((chat) => chat.id === activeChat);
      if (selectedChat) {
        setMessages(selectedChat.messages);
      }
    } else {
      setMessages([]); // Clear messages if no chat is active
    }
  }, [activeChat, chatHistory]);

  // Persist state on page refresh
  useEffect(() => {
    const savedState = JSON.parse(localStorage.getItem("appState"));
    if (savedState) {
      setCode(savedState.code);
      setMessages(savedState.messages);
      setChatHistory(savedState.chatHistory);
      setActiveChat(savedState.activeChat);
      setTheme(savedState.theme);
      setShowHomepage(savedState.showHomepage);
    }
  }, []);

  useEffect(() => {
    const state = {
      code,
      messages,
      chatHistory,
      activeChat,
      theme,
      showHomepage,
    };
    localStorage.setItem("appState", JSON.stringify(state));
  }, [code, messages, chatHistory, activeChat, theme, showHomepage]);

  // Send code to AI for review
  async function sendMessage() {
    if (!code.trim()) return;

    // If no chat is active, create a new one automatically
    if (activeChat === null) {
      const newChat = { id: Date.now(), name: "New Chat", messages: [] };
      setChatHistory([...chatHistory, newChat]);
      setActiveChat(newChat.id);
      setMessages([]);
    }

    const newMessages = [...messages, { text: code, sender: "user" }];
    setMessages(newMessages);
    setCode("");
    setIsTyping(true);

    try {
      const response = await axios.post(
        `http://localhost:3000/ai/get-review/`,
        {
          code,
        }
      );

      const aiResponse = response.data?.trim() || "⚠️ AI Response Error";
      const updatedMessages = [
        ...newMessages,
        { text: aiResponse, sender: "ai" },
      ];
      setMessages(updatedMessages);

      // Update chat history with the new messages
      const updatedChatHistory = chatHistory.map((chat) =>
        chat.id === activeChat ? { ...chat, messages: updatedMessages } : chat
      );
      setChatHistory(updatedChatHistory);
    } catch (error) {
      setMessages([
        ...newMessages,
        { text: "⚠️ Error getting AI response.", sender: "ai" },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  // Copy text to clipboard
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  // Open modal for creating a new chat
  function openModal() {
    setModalIsOpen(true);
  }

  // Close modal and reset new chat name
  function closeModal() {
    setModalIsOpen(false);
    setNewChatName("");
  }

  // Create a new chat
  function createNewChat() {
    if (!newChatName.trim()) return;

    const newChat = { id: Date.now(), name: newChatName, messages: [] };
    setChatHistory([...chatHistory, newChat]);
    setActiveChat(newChat.id);
    setMessages([]);
    setNewChatName("");
    closeModal(); // Close modal automatically
  }

  // Load a specific chat
  function loadChat(chat) {
    setActiveChat(chat.id);
    setIsSidebarOpen(false); // Close sidebar on mobile after selecting a chat
  }

  // Delete a chat
  function deleteChat(chatId) {
    setChatHistory(chatHistory.filter((chat) => chat.id !== chatId));
    if (activeChat === chatId) {
      setMessages([]);
      setActiveChat(null);
    }
  }

  // Handle Enter key in modal
  const handleModalKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission or other default behavior
      createNewChat();
    }
  };

  // Handle Enter key in editor (Shift + Enter for new line, Enter to send)
  const handleEditorKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent default behavior (new line)
      sendMessage();
    }
  };

  // Homepage Component
  const Homepage = () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="md:text-6xl text-5xl text-center  font-bold mb-4"
        >
          Welcome to AI CHATBOT
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-xl mb-8"
        >
          Get instant feedback with AI.
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          onClick={() => setShowHomepage(false)}
          className="bg-white text-blue-600 px-6 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition"
        >
          Go to chat
        </motion.button>
      </div>
    );
  };

  // Render Homepage if showHomepage is true
  if (showHomepage) {
    return <Homepage />;
  }

  return (
    <div
      className={`flex min-h-screen ${
        theme === "dark"
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* Sidebar Toggle Button for Mobile */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 p-2 bg-blue-500 rounded-full z-50 lg:hidden"
      >
        <PlusIcon className="w-6 h-6 text-white" />
      </button>

      {/* Sidebar */}
      <div
        className={`w-64 p-4 space-y-4 border-r fixed lg:static h-screen lg:h-auto transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300 ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <button
          onClick={openModal}
          className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          New Chat
        </button>

        <div className="flex flex-col gap-2">
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              className={`flex items-center justify-between rounded-lg p-2 ${
                activeChat === chat.id
                  ? "border border-blue-500"
                  : theme === "dark"
                  ? "bg-gray-700"
                  : "bg-gray-100"
              }`}
            >
              <button
                onClick={() => loadChat(chat)}
                className="text-left text-sm flex-grow"
              >
                {chat.name}
              </button>
              <button
                onClick={() => deleteChat(chat.id)}
                className="text-red-400 hover:text-red-300"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center flex-grow p-6 gap-4 lg:ml-30">
        <header
          className={`w-full text-center py-4 text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg rounded-lg ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          AI CHATBOT
        </header>

        {/* Chat Messages */}
        <div
          className={`w-full max-w-4xl h-[500px] p-4 rounded-lg shadow-lg border overflow-y-auto flex flex-col space-y-4 ${
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`p-3 rounded-lg break-words w-fit max-w-lg ${
                msg.sender === "user"
                  ? theme === "dark"
                    ? "self-end bg-gray-600"
                    : "self-end bg-gray-200"
                  : theme === "dark"
                  ? "self-start bg-gray-700"
                  : "self-start bg-gray-100"
              }`}
            >
              {msg.sender === "ai" ? (
                <div className="relative">
                  <Markdown
                    rehypePlugins={[rehypeHighlight]}
                    className={`break-words ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {DOMPurify.sanitize(msg.text)}
                  </Markdown>
                  <button
                    onClick={() => copyToClipboard(msg.text)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-200"
                  >
                    <ClipboardIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <pre
                  className={`whitespace-pre-wrap ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {msg.text}
                </pre>
              )}
            </motion.div>
          ))}
          {isTyping && (
            <div
              className={`self-start ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              AI is typing...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Code Editor and Send Button */}
        <div className="w-full max-w-4xl flex items-center gap-2">
          <div
            className={`flex-grow border rounded-lg p-2 max-h-[200px] overflow-y-auto ${
              theme === "dark"
                ? "bg-gray-900 border-gray-600"
                : "bg-white border-gray-300"
            }`}
          >
            <Editor
              value={code}
              onValueChange={setCode}
              highlight={(code) =>
                Prism.highlight(code, Prism.languages.javascript, "javascript")
              }
              padding={10}
              style={{
                fontFamily: "Fira Code, monospace",
                fontSize: 16,
                maxHeight: "150px",
                minHeight: "60px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
                color: theme === "dark" ? "#FFFFFF" : "#000000",
              }}
              onKeyDown={handleEditorKeyPress}
            />
          </div>
          <button
            onClick={sendMessage}
            className="bg-blue-500 px-6 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            Send 🚀
          </button>
        </div>

        {/* Toggle Theme Button */}
        <button
          onClick={toggleTheme}
          className="fixed bottom-4 right-4 p-3 bg-blue-500 rounded-full hover:bg-blue-600 transition"
        >
          {theme === "dark" ? (
            <SunIcon className="w-6 h-6 text-white" />
          ) : (
            <MoonIcon className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Modal for Creating New Chat */}
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          className={`modal p-6 rounded-lg shadow-lg mx-auto mt-20 w-80 ${
            theme === "dark"
              ? "bg-gray-700 text-white"
              : "bg-white text-gray-900"
          }`}
          overlayClassName="fixed inset-0 bg-black bg-opacity-50"
        >
          <h2 className="text-lg mb-4">Enter Chat Name</h2>
          <input
            type="text"
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            onKeyDown={handleModalKeyPress}
            className={`w-full p-2 rounded-lg ${
              theme === "dark"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-900"
            }`}
          />
          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={closeModal}
              className={`${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={createNewChat}
              className="bg-blue-500 px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Create
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default App;
