import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; 

const MicIcon = ({ isListening }) => (
    <svg className={`w-6 h-6 transition-colors ${isListening ? 'text-red-500' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a4 4 0 110-8 4 4 0 010 8z"></path>
    </svg>
);

const SendIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
);

const ChatMessage = ({ sender, text }) => {
    const bubbleClass = sender === 'ai' ? 'bg-white text-gray-800 rounded-2xl rounded-bl-lg' : 'bg-blue-500 text-white rounded-2xl rounded-br-lg';
    const alignment = sender === 'ai' ? 'self-start' : 'self-end';

    const renderMarkdown = (rawText) => {
        const htmlText = rawText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```(python|)\n([\s\S]*?)```/g, '<pre class="bg-gray-800 text-white p-3 rounded-md my-2 text-sm overflow-x-auto"><code>$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-red-500 px-1 rounded">$1</code>')
            .replace(/\n/g, '<br />');
        return { __html: htmlText };
    };

    return (
        <div className={`w-fit max-w-lg p-4 shadow-md ${bubbleClass} ${alignment} animate-fadeIn`}>
            <div dangerouslySetInnerHTML={renderMarkdown(text)} />
        </div>
    );
};

export default function App() {
    const [fileName, setFileName] = useState('');
    const [dataSummary, setDataSummary] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [userName, setUserName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [conversationState, setConversationState] = useState('AWAITING_NAME'); 

    const chatEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const synthesisRef = useRef(window.speechSynthesis);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isLoading]);
    
    // useEffect(() => {
    //     const fetchSummary = async () => {
    //         try {
    //             const response = await axios.post('http://localhost:5000/summary');
    //             if (response.data.summary) {
    //                 setDataSummary(response.data.summary);
    //                 console.log("Summary fetched successfully:", response.data.summary);
                    
    //                 const greeting = `Hi there! I've successfully loaded and summarized your data. I'm your personal data assistant. To make things a bit more friendly, what should I call you?`;
    //                 addAiMessage(greeting);
    //                 speakText(greeting);
    //             }
    //         } catch (error) {
    //             console.error("Error fetching data summary:", error);
    //             setDataSummary({ error: "Failed to load summary. Please ensure a file has been uploaded." });
    //             const errorMessage = "Sorry, I couldn't load the data summary. Please go back and upload a file again.";
    //             addAiMessage(errorMessage);
    //             speakText(errorMessage);
    //         }
    //     };

    //     fetchSummary();
    // }, []); 
    useEffect(() => {
    const fetchSummary = async () => {
        try {
            // Change this line from axios.post to axios.get
            const response = await axios.get('http://localhost:5000/summary'); 
            if (response.data.summary) {
                setDataSummary(response.data.summary);
                console.log("Summary fetched successfully:", response.data.summary);
                
                const greeting = `Hi there! I've successfully loaded and summarized your data. I'm your personal data assistant. To make things a bit more friendly, what should I call you?`;
                addAiMessage(greeting);
                speakText(greeting);
            }
        } catch (error) {
            console.error("Error fetching data summary:", error);
            setDataSummary({ error: "Failed to load summary. Please ensure a file has been uploaded." });
            const errorMessage = "Sorry, I couldn't load the data summary. Please go back and upload a file again.";
            addAiMessage(errorMessage);
            speakText(errorMessage);
        }
    };

    fetchSummary();
}, []); 

    useEffect(() => {
        const handleConversationReady = async () => {
            if (conversationState === 'READY' && userName) {
                const intro = `Great to meet you, ${userName}! How can I assist you with your data today?`;
                addAiMessage(intro);
                speakText(intro);
            }
        };

        handleConversationReady();
    }, [conversationState, userName]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const handleUserInput = async (text = userInput.trim()) => {
        if (!text || isLoading || isSpeaking) return;

        setChatHistory(prev => [...prev, { sender: 'user', text }]);
        setUserInput('');
        setIsLoading(true);
        stopSpeaking(); 

        if (conversationState === 'AWAITING_NAME') {
            setUserName(text);
            setConversationState('READY');
        } else if (conversationState === 'READY') {
            const prompt = `You are a friendly and helpful data science assistant. Your name is Gemini. The user, named ${userName}, has uploaded a dataset with this summary: ${JSON.stringify(dataSummary)}. The user's request is: "${text}". Please provide a concise, helpful, and easy-to-understand response. If you suggest code, use Python.`;
            
            try {
                const aiResponse = await getAiResponse(prompt);
                addAiMessage(aiResponse);
                speakText(aiResponse);
            } catch (error) {
                const errorMessage = `Sorry, I'm having trouble. It looks like the API request failed. Please check your network connection and ensure your API key is correctly entered. Error: ${error.message}`;
                addAiMessage(errorMessage);
                speakText(errorMessage);
                console.error("API Error:", error);
            }
        }
        setIsLoading(false);
    };
    
    const getAnalysisSuggestions = async () => {
        setIsLoading(true);
        const prompt = `You are a helpful and friendly data analysis assistant named Gemini. The user, named ${userName}, has just uploaded a dataset. The summary of this dataset is: ${JSON.stringify(dataSummary)}. Based on this, provide a short, conversational list of 3-4 possible questions or tasks a data analyst might perform to begin exploring this data. Frame the suggestions as things the user can ask you to do, such as "Can you show me the average of [column name]?"`;
        
        try {
            const aiResponse = await getAiResponse(prompt);
            return aiResponse;
        } catch (error) {
            console.error("Error getting analysis suggestions:", error);
            return "Sorry, I couldn't generate suggestions at the moment.";
        } finally {
            setIsLoading(false);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };
    
    const startListening = () => {
        stopSpeaking(); 
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser does not support the Web Speech API. Please use a modern browser like Chrome.");
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.continuous = false;
        
        recognition.onstart = () => {
            setIsListening(true);
            setUserInput("Listening...");
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setUserInput(transcript);
            setTimeout(() => handleUserInput(transcript), 100);
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            setUserInput('');
        };
        
        recognition.onend = () => {
            setIsListening(false);
        };
        
        recognition.start();
        recognitionRef.current = recognition;
    };
    
    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };
    
    const speakText = (text) => {
        if (!synthesisRef.current || isSpeaking) return;
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        const voices = synthesisRef.current.getVoices();
        const desiredVoice = voices.find(voice => voice.name === 'Google UK English Male' || voice.name === 'Karen');
        if (desiredVoice) {
            utterance.voice = desiredVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            setIsSpeaking(false);
        };

        synthesisRef.current.speak(utterance);
    };

    const stopSpeaking = () => {
        if (synthesisRef.current && synthesisRef.current.speaking) {
            synthesisRef.current.cancel();
            setIsSpeaking(false);
        }
    };
    
    const getAiResponse = async (prompt) => {
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        };

        let response;
        let delay = 1000;
        for (let i = 0; i < 5; i++) {
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                        return result.candidates[0].content.parts[0].text;
                    }
                } else if (response.status === 429 || response.status >= 500) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                } else {
                    break;
                }
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
        
        throw new Error("Failed to get a response from the AI after several retries.");
    };
    
    const addAiMessage = (text) => {
        setChatHistory(prev => [...prev, { sender: 'ai', text }]);
    };

    return (
        <div className="font-sans bg-gray-100">
            <div className="w-full max-w-6xl mx-auto bg-white/50 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden flex flex-col" style={{ height: '95vh', margin: '2.5vh auto' }}>
                <header className="bg-white/80 border-b border-gray-200 p-4 flex justify-between items-center z-10">
                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
                        Interactive AI Data Dashboard
                    </h1>
                </header>
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div className="flex-1 flex flex-col p-4 bg-gray-100/50">
                        <div className="flex-1 space-y-4 overflow-y-auto p-4">
                            {chatHistory.map((msg, index) => (
                                <ChatMessage key={index} sender={msg.sender} text={msg.text} />
                            ))}
                            {(isLoading || isSpeaking) && (
                                <div className="w-fit max-w-lg p-4 shadow-md bg-white text-gray-800 rounded-2xl rounded-bl-lg self-start flex items-center gap-3">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-300"></div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <input
                                id="user-input"
                                type="text"
                                className="flex-1 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                placeholder={conversationState === 'AWAITING_NAME' ? "What's your name?" : "Ask about your data..."}
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleUserInput()}
                                disabled={isLoading || isListening || isSpeaking || !dataSummary}
                            />
                            <button
                                onClick={toggleListening}
                                className={`p-4 rounded-lg transition-colors duration-300 ${isListening ? 'bg-red-600' : 'bg-gray-800'}`}
                                disabled={isLoading || isSpeaking || !dataSummary}
                            >
                                <MicIcon isListening={isListening} />
                            </button>
                            <button
                                onClick={() => handleUserInput()}
                                className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition-colors duration-300 disabled:bg-gray-400"
                                disabled={isLoading || isListening || isSpeaking || !userInput || !dataSummary}
                            >
                                <SendIcon />
                            </button>
                        </div>
                    </div>

                    <div className="w-full md:w-1/3 bg-white border-l border-gray-200 p-6 overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Data Summary</h2>
                        {dataSummary ? (
                            <div className="text-sm text-gray-600 space-y-4">
                                {Object.entries(dataSummary).map(([key, value]) => (
                                    <div key={key} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                        <p className="font-semibold text-gray-700">{key}</p>
                                        <p className="text-gray-500 break-words text-xs mt-1">
                                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No summary available. Please upload a CSV file.</p>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
            `}</style>
        </div>
    );
}