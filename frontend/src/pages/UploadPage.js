import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// A helper component to create the animated data stream background
const DataStreamBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // An array to hold our data particles
        const particles = [];
        const particleCount = 200;

        // Particle class to manage each individual particle
        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 0.5 - 0.25;
                this.speedY = Math.random() * 0.5 - 0.25;
                this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                // Wrap particles around the canvas
                if (this.x > canvas.width || this.x < 0) this.x = Math.random() * canvas.width;
                if (this.y > canvas.height || this.y < 0) this.y = Math.random() * canvas.height;
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Function to initialize the particles
        const init = () => {
            particles.length = 0; // Clear existing particles
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        // Animation loop
        const animate = () => {
            // Create a semi-transparent overlay for a "trailing" effect
            ctx.fillStyle = 'rgba(1, 1, 1, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw and update each particle
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        // Handle canvas resizing
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call to set canvas size and populate particles

        animate();

        // Cleanup function for when the component unmounts
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0"></canvas>;
};

export default function UploadPage() {
    const [file, setFile] = useState(null);
    const [displayText, setDisplayText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const messageIndex = useRef(0);
    const charIndex = useRef(0);
    const intervalId = useRef(null);
    const navigate = useNavigate();
    const [message, setMessage] = useState('');

    // Define the welcome messages
    const messages = [
        "Hello, I'm your AI Data Assistant.",
        "I'm ready to help you uncover insights from your data.",
        "Please upload a file, and let's get started!"
    ];

    // Typing effect logic
    useEffect(() => {
        const type = () => {
            const currentMessage = messages[messageIndex.current];
            if (charIndex.current < currentMessage.length) {
                setDisplayText(prev => prev + currentMessage.charAt(charIndex.current));
                charIndex.current++;
            } else {
                // Message is complete, set isTyping to false and clear interval
                setIsTyping(false); 
                clearInterval(intervalId.current);
                
                // Wait and then start typing the next message
                setTimeout(() => {
                    if (messageIndex.current < messages.length - 1) {
                        messageIndex.current++;
                        charIndex.current = 0;
                        setDisplayText('');
                        setIsTyping(true);
                        intervalId.current = setInterval(type, 50); // Speed of typing
                    }
                }, 1500); // Pause before next message
            }
        };

        // Initial start of typing effect
        intervalId.current = setInterval(type, 50);

        return () => {
            // Cleanup on unmount
            clearInterval(intervalId.current);
        };
    }, []);

    const handleUpload = async () => {
    if (!file) {
        setMessage("Please select a file first.");
        return;
    }

    setMessage("Uploading file...");
    const formData = new FormData();
    formData.append('file', file);
    try {
        await axios.post('http://localhost:5000/upload', formData);
        setMessage("Upload successful! Redirecting to dashboard...");
        // Redirect to the dashboard on successful upload
        navigate('/dashboard'); // This is the line to add
        setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
        setMessage("Upload failed: " + (error.response?.data?.error || error.message));
    }
};



    return (
        <div className="relative min-h-screen overflow-hidden font-inter bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-4">
            {/* Animated Grid Background */}
            <DataStreamBackground />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-2xl text-center space-y-12">
                {/* Main Heading */}
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-500 to-purple-600 animate-fade-in-down">
                    The Data Sphere
                </h1>

                {/* AI Assistant Chat Box */}
                <div className="w-full max-w-lg mx-auto bg-gray-800/70 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700 animate-fade-in">
                    <div className="flex items-start">
                        {/* AI Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-teal-400 mr-4 mt-1" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5V16h2v1.5c0 .28-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5zm.5-9.5c.28 0 .5.22.5.5v2c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-2c0-.28.22-.5.5-.5zm-4.5 9.5V16h2v1.5c0 .28-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5zM15 16h2v1.5c0 .28-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5zM7.5 7h9c.28 0 .5-.22.5-.5S16.78 6 16.5 6h-9c-.28 0-.5.22-.5.5S7.22 7 7.5 7zm-1 3.5c-.28 0-.5-.22-.5-.5V8.5c0-.28.22-.5.5-.5s.5.22.5.5v2c0 .28-.22.5-.5.5zm11 0c-.28 0-.5-.22-.5-.5V8.5c0-.28.22-.5.5-.5s.5.22.5.5v2c0 .28-.22.5-.5.5z"/>
                        </svg>
                        <div>
                            <h2 className="text-xl font-bold text-teal-400 mb-2">AI Assistant</h2>
                            <p className="text-lg text-gray-300 font-mono tracking-wide">
                                {displayText}
                                <span className={`inline-block w-2 h-4 bg-teal-400 ml-1 animate-pulse ${isTyping ? '' : 'hidden'}`}></span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Upload Form */}
                <div className="w-full max-w-lg mx-auto bg-gray-800/70 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-gray-700 animate-fade-in">
                    <h2 className="text-2xl font-bold text-white mb-6">Unleash Your Data</h2>
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <label htmlFor="file-upload" className="w-full flex justify-center items-center py-4 px-6 rounded-lg border-2 border-dashed border-blue-500 hover:border-blue-400 transition-all duration-300 cursor-pointer">
                            <span className="text-blue-500 mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </span>
                            <span className="text-gray-300 text-sm md:text-base">
                                {file ? file.name : "Drag and drop a CSV or click to browse"}
                            </span>
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            accept=".csv"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="hidden"
                        />
                        <button
                            onClick={handleUpload}
                            className="w-full py-4 px-6 font-bold rounded-lg shadow-md transition-all duration-300
                                       bg-gradient-to-r from-blue-500 to-purple-600 text-white
                                       hover:from-blue-600 hover:to-purple-700 hover:scale-105"
                        >
                            Analyze
                        </button>
                    </div>
                    {message && (
                        <p className="mt-4 text-sm text-center font-medium text-gray-400">
                            {message}
                        </p>
                    )}
                </div>
            </div>

            {/* CSS keyframes for animations */}
            <style>{`
                .font-inter { font-family: 'Inter', sans-serif; }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 1s ease-out forwards; }
                .animate-fade-in-down { animation: fade-in-down 1s ease-out forwards; }
            `}</style>
        </div>
    );
}
