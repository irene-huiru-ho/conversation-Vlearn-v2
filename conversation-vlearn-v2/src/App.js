import React from 'react';
import { useState, useEffect, useRef } from "react";
import { Upload, X, MessageCircle, Lightbulb, Send, Camera, Settings, Trash2, Plus, Mic, MicOff, Type, Volume2, AlertCircle, Eye, Palette, Hash, HelpCircle } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Enhanced Google Cloud Speech-to-Text Hook with better error handling
const useGoogleSpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = []; 
  
      setMediaRecorder(recorder);
      setIsListening(true);
      setError(null);
  
      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
  
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' }); 
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
  
      recorder.start();
    } catch (err) {
      setError(`Microphone access denied: ${err.message}`);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    console.log('🎤 Stopping recording...');
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsListening(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    const apiKey = process.env.REACT_APP_GOOGLE_CLOUD_API_KEY;
    
    if (!apiKey) {
      setError('Google Cloud API key not found. Check your .env file.');
      console.error('❌ Google Cloud API key missing');
      return;
    }

    try {
      console.log('🔄 Converting audio to base64...');
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        console.log('🔄 Audio converted, calling Google Cloud Speech API...');
        
        const response = await fetch('https://speech.googleapis.com/v1/speech:recognize?key=' + apiKey, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode: 'en-US',
            },
            audio: {
              content: base64Audio,
            },
          }),
        });

        console.log('🔄 Speech API response status:', response.status);
        const result = await response.json();
        console.log('🔄 Speech API response:', result);

        if (result.results && result.results[0]) {
          const transcribedText = result.results[0].alternatives[0].transcript;
          console.log('✅ Transcription successful:', transcribedText);
          setTranscript(transcribedText);
        } else {
          console.warn('⚠️ No transcription results');
          setError('No speech detected. Try speaking louder or closer to the microphone.');
        }
      };
    } catch (err) {
      console.error('❌ Transcription error:', err);
      setError(`Transcription failed: ${err.message}`);
    }
  };

  const resetTranscript = () => setTranscript('');

  return { isListening, transcript, error, startListening, stopListening, resetTranscript };
};

// Enhanced Google Cloud Text-to-Speech Hook with better error handling
const useGoogleTextToSpeech = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState(null);
    const audioRef = useRef(null);  
  
    const speak = async (text) => {
      const apiKey = process.env.REACT_APP_GOOGLE_CLOUD_API_KEY;
  
      if (!apiKey) {
        setError('Google Cloud API key not found. Check your .env file.');
        console.error('❌ Google Cloud API key missing for TTS');
        return;
      }
  
      try {
        setIsSpeaking(true);
        setError(null);
  
        const response = await fetch(
          'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + apiKey,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text },
              voice: {
                languageCode: 'en-US',
                name: 'en-US-Wavenet-F',
                ssmlGender: 'FEMALE',
              },
              audioConfig: { audioEncoding: 'MP3' },
            }),
          }
        );
  
        const result = await response.json();
  
        if (result.audioContent) {
          // If an audio is already playing, stop it first
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
  
          const audio = new Audio(`data:audio/mp3;base64,${result.audioContent}`);
          audioRef.current = audio;
  
          audio.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
          };
  
          audio.onerror = (err) => {
            setError('Audio playback failed');
            setIsSpeaking(false);
            audioRef.current = null;
            console.error('🔊 Audio playback error:', err);
          };
  
          await audio.play();
        } else {
          setError('Text-to-speech failed: No audio content received');
          setIsSpeaking(false);
        }
      } catch (err) {
        setError(`Text-to-speech failed: ${err.message}`);
        setIsSpeaking(false);
      }
    };
  
    const stop = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0; // Reset to start
        audioRef.current = null;
      }
      setIsSpeaking(false);
    };
  
    return { speak, stop, isSpeaking, error };
  };
  

const MediaLibraryInterface = () => {
    // 🔑 API KEYS - Read from environment variables
    const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
    const GOOGLE_CLOUD_API_KEY = process.env.REACT_APP_GOOGLE_CLOUD_API_KEY;

    const [mediaFiles, setMediaFiles] = useState([]);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [age, setAge] = useState(''); 
    const [focus, setFocus] = useState('');
    const [mode, setMode] = useState('conversation');
    const [conversationType, setConversationType] = useState('text');
    const [apiInput, setInput] = useState('');
    const [apiResponses, setResponses] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');
    const [selectedActivityCard, setSelectedActivityCard] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [expandedCards, setExpandedCards] = useState(new Set());
    
    // New state for current active AI response in voice mode
    const [currentAIResponse, setCurrentAIResponse] = useState('');

    // Google Cloud Voice hooks
    const { isListening, transcript, startListening, stopListening, resetTranscript, error: sttError } = useGoogleSpeechToText();
    const { speak, stop, isSpeaking, error: ttsError } = useGoogleTextToSpeech();

    const focusChoices = [
        { value: "Literacy and Communication", label: "Literacy and Communication", icon: <span role="img" aria-label="book">📚</span> },
        { value: "STEM", label: "STEM", icon: <span role="img" aria-label="gears">⚙️</span> },
        { value: "Creativity", label: "Creativity", icon: <span role="img" aria-label="art">🎨</span> },
        { value: "Emotional Intelligence", label: "Emotional Intelligence", icon: <span role="img" aria-label="heart">❤️</span> },
    ];

    // Load saved data on component mount
    useEffect(() => {
        const savedConversations = localStorage.getItem('ai-media-conversations');

        if (savedConversations) {
            try {
                setResponses(JSON.parse(savedConversations));
            } catch (err) {
                console.error('Error loading saved conversations:', err);
            }
        }
        
    }, []);

    // Save conversations to localStorage whenever they change
    useEffect(() => {
        if (apiResponses.length > 0) {
            localStorage.setItem('ai-media-conversations', JSON.stringify(apiResponses));
        }
    }, [apiResponses]);

    // Auto-download conversation as JSON file ONLY on browser refresh/close
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (apiResponses.length > 0) {
                // Only auto-download, don't trigger manual download
                const conversationData = {
                    timestamp: new Date().toISOString(),
                    sessionId: Date.now(),
                    selectedImage: selectedMedia ? selectedMedia.name : null,
                    childAge: age,
                    focusArea: focus,
                    mode: mode,
                    conversationType: conversationType,
                    totalMessages: apiResponses.length,
                    messages: apiResponses.map((response, index) => ({
                        messageId: index + 1,
                        timestamp: response.timestamp || new Date(response.responseId || Date.now()).toISOString(),
                        type: response.type || (response.sender === 'user' ? 'user_message' : 'ai_response'),
                        sender: response.sender || 'ai',
                        content: response.candidates?.[0]?.content?.parts?.[0]?.text || response.content || '',
                        userMessage: response.userMessage || null,
                        responseId: response.responseId
                    }))
                };

                const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `conversation_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                console.log('✅ Auto-saved conversation on page unload');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [apiResponses, selectedMedia, age, focus, mode, conversationType]);

    // Save media files to localStorage whenever they change (exclude File objects)
    useEffect(() => {
        if (mediaFiles.length > 0) {
            // Only save metadata, not the actual File objects
            const mediaMetadata = mediaFiles.map(file => ({
                id: file.id,
                name: file.name,
                url: file.url,
                type: file.type || 'image/jpeg',
                size: file.size || 0
            }));
            localStorage.setItem('ai-media-files', JSON.stringify(mediaMetadata));
        }
    }, [mediaFiles]);

    // Function to manually save conversation as JSON file
    const saveConversationToFile = () => {
        if (apiResponses.length === 0) return;
        
        const conversationData = {
            timestamp: new Date().toISOString(),
            sessionId: Date.now(),
            selectedImage: selectedMedia ? selectedMedia.name : null,
            childAge: age,
            focusArea: focus,
            mode: mode,
            conversationType: conversationType,
            totalMessages: apiResponses.length,
            messages: apiResponses.map((response, index) => ({
                messageId: index + 1,
                timestamp: response.timestamp || new Date(response.responseId || Date.now()).toISOString(),
                type: response.type || (response.sender === 'user' ? 'user_message' : 'ai_response'),
                sender: response.sender || 'ai',
                content: response.candidates?.[0]?.content?.parts?.[0]?.text || response.content || '',
                userMessage: response.userMessage || null,
                responseId: response.responseId
            }))
        };

        const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `conversation_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('✅ Manual conversation download:', conversationData.totalMessages, 'messages');
        setDebugInfo(`Conversation downloaded: ${conversationData.totalMessages} messages`);
    };

    // Function to save selected image
    const saveImageToFile = () => {
        if (!selectedMedia) return;
        
        const link = document.createElement('a');
        link.href = selectedMedia.url;
        link.download = selectedMedia.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const uploadMedia = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        const newFiles = Array.from(files).map(file => {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                console.warn('Skipping non-image file:', file.name);
                return null;
            }
            
            return {
                id: file.name + Date.now(),
                file: file, // Keep the original File object
                url: URL.createObjectURL(file),
                name: file.name,
                type: file.type,
                size: file.size
            };
        }).filter(Boolean); // Remove null entries

        if (newFiles.length > 0) {
            setMediaFiles(prev => [...prev, ...newFiles]);
        }
        e.target.value = '';
    };

    const deleteMedia = (fileId) => {
        setMediaFiles(prev => prev.filter(file => file.id !== fileId));
        if(selectedMedia && selectedMedia.id === fileId) {
            setSelectedMedia(null);
            setResponses([]);
        }
    };
 
    const selectMedia = (file) => {
        if (file.needsReupload || !file.file) {
            alert('This image needs to be re-uploaded. Please drag and drop or upload it again to use with AI analysis.');
            return;
        }
        setSelectedMedia(file);
        setResponses([]);
        setInput('');
    };

    const conversation = () => {
        console.log('🔄 Switching to conversation mode - clearing all state');
        setResponses([]);
        setMode('conversation');
        setConversationType('text');
        setInput('');
        setCurrentAIResponse(''); // Clear current AI response
        setShowChatHistory(false); // Reset chat history visibility
        resetTranscript(); // Clear any existing transcript when switching modes
    };

    const suggestion = () => {
        setResponses([]);
        setMode('suggestion');
        setInput('');
        setCurrentAIResponse(''); // Clear current AI response
        setShowChatHistory(false); // Reset chat history visibility
        setExpandedCards(new Set()); // Reset expanded cards when switching to suggestion mode
    };

    // Voice recording functions with improved flow
    const startRecording = async () => {
        console.log('🎤 Starting new recording - clearing all previous state');
        // Completely clear all previous state before starting new recording
        resetTranscript();
        setInput('');
        setCurrentAIResponse(''); // Clear current AI response when starting to record
        // Add a small delay to ensure state is cleared
        setTimeout(async () => {
            await startListening();
        }, 100);
    };

    const stopRecording = async () => {
        console.log('🎤 Stopping current recording');
        stopListening();
        // Note: transcript will be processed in useEffect below
    };

    // Handle voice transcript - add to conversation but don't auto-send
    useEffect(() => {
        console.log('🎤 Transcript useEffect triggered:', { transcript, conversationType, isListening });
        if (transcript && conversationType === 'voice' && !isListening) {
            console.log('🎤 Setting input to new transcript:', transcript);
            // Only update input field when recording is complete and we have a new transcript
            setInput(transcript);
        }
    }, [transcript, conversationType, isListening]);

    const playResponse = (text) => {
        setCurrentAIResponse(text); // Set the current AI response being played
        speak(text);
    };

    // Clear current AI response when speaking finishes
    useEffect(() => {
        if (!isSpeaking && currentAIResponse) {
            // Small delay to ensure smooth transition
            setTimeout(() => {
                setCurrentAIResponse('');
            }, 500);
        }
    }, [isSpeaking, currentAIResponse]);

    // Function to toggle card description expansion
    const toggleCardExpansion = (cardIndex) => {
        const newExpanded = new Set(expandedCards);
        if (newExpanded.has(cardIndex)) {
            newExpanded.delete(cardIndex);
        } else {
            newExpanded.add(cardIndex);
        }
        setExpandedCards(newExpanded);
    };

    // Function to truncate text
    const truncateText = (text, maxLength = 120) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Function to parse suggestions into cards
    const parseSuggestionCards = (text) => {
        // Clean the text by removing markdown formatting and emojis
        const cleanText = text
            .replace(/\*\*/g, '') // Remove bold markdown
            .replace(/\*/g, '')   // Remove italic markdown
            .replace(/#{1,6}\s*/g, '') // Remove headers
            .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, ''); // Remove emojis
        
        const lines = cleanText.split('\n').filter(line => line.trim());
        const cards = [];
        
        let currentCard = null;
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            // Look for activity titles (Activity 1:, Activity 2:, etc.)
            if (line.match(/^Activity\s+\d+:/i)) {
                // Save previous card if exists
                if (currentCard) {
                    cards.push(currentCard);
                }
                
                // Extract title (everything after "Activity X:")
                const titleMatch = line.match(/^Activity\s+\d+:\s*(.+)/i);
                currentCard = {
                    title: titleMatch ? titleMatch[1].trim() : line.replace(/^Activity\s+\d+:\s*/i, ''),
                    description: ''
                };
            } else if (currentCard && line.trim()) {
                // Add to description
                currentCard.description += (currentCard.description ? ' ' : '') + line.trim();
            } else if (line.match(/^\d+\.\s*(.+)/) || line.match(/^-\s*(.+)/)) {
                // Handle numbered or bulleted lists as activities
                if (currentCard) {
                    cards.push(currentCard);
                }
                
                const titleMatch = line.match(/^[\d-]+\.\s*(.+)/) || line.match(/^-\s*(.+)/);
                currentCard = {
                    title: titleMatch ? titleMatch[1].trim() : line.trim(),
                    description: ''
                };
            }
        }
        
        // Add last card
        if (currentCard) {
            cards.push(currentCard);
        }
        
        // If no structured activities found, try to split by paragraphs
        if (cards.length === 0) {
            const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
            paragraphs.forEach((paragraph, index) => {
                if (paragraph.trim()) {
                    const sentences = paragraph.trim().split('. ');
                    const title = sentences[0] || `Activity ${index + 1}`;
                    const description = sentences.slice(1).join('. ') || sentences[0];
                    
                    cards.push({
                        title: title.replace(/[.:]$/, ''),
                        description: description
                    });
                }
            });
        }
        
        // Ensure we have at least some cards
        if (cards.length === 0) {
            return [
                {
                    title: "Creative Activity",
                    description: cleanText.substring(0, 200) + (cleanText.length > 200 ? '...' : '')
                }
            ];
        }
        
        // Limit to 6 cards maximum
        return cards.slice(0, 6);
    };
    
    //converts image to pass into gemini with error handling
    const convertImage = async (file) => {
        if (!file) {
            throw new Error('No file provided for conversion');
        }
        
        if (!(file instanceof File) && !(file instanceof Blob)) {
            throw new Error('Invalid file type - must be a File or Blob object');
        }

        try {
            const convertedImage = new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const result = reader.result.split(',')[1];
                        resolve(result);
                    } catch (error) {
                        reject(new Error('Failed to process file data'));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
            
            const base64Data = await convertedImage;
            return {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type || 'image/jpeg'
                }
            };
        } catch (error) {
            console.error('Error converting image:', error);
            throw new Error(`Image conversion failed: ${error.message}`);
        }
    };

    // 🚀 ENHANCED GEMINI API IMPLEMENTATION with user message tracking
    const getApiResponse = async (userMessage = null) => {
        const actualUserMessage = userMessage || apiInput;
        
        console.log('🤖 Starting API call...');
        setDebugInfo('Starting API call...');
        
        if (!selectedMedia || !age || !focus) {
            const error = 'Please select an image, enter age, and choose a focus area.';
            alert(error);
            setDebugInfo(error);
            return;
        }

        if (!GEMINI_API_KEY) {
            const error = 'Gemini API key not found. Check your .env file.';
            alert(error);
            setDebugInfo(error);
            console.error('❌ Gemini API key missing');
            return;
        }

        console.log('🤖 API key found, starting generation...');
        setDebugInfo('API key found, processing image...');
        setIsGenerating(true);
        
        try {
            const ai = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            
            console.log('🤖 Converting image...');
            setDebugInfo('Converting image...');
            const image = await convertImage(selectedMedia.file);
            
            let prompt;
            
            if (mode === 'conversation') {
                // Add user message to conversation history FIRST
                if (actualUserMessage && apiResponses.length > 0) {
                    const userMessageObj = {
                        responseId: Date.now() - 1, // Ensure user message comes before AI response
                        timestamp: new Date().toISOString(),
                        type: 'user_message',
                        sender: 'user',
                        content: actualUserMessage,
                        candidates: [{
                            content: {
                                parts: [{ text: actualUserMessage }]
                            }
                        }]
                    };
                    setResponses(prev => [...prev, userMessageObj]);
                }
                
                if (apiResponses.length === 0) {
                    prompt = `Begin a conversation about this image specifically focused on ${focus} for a ${age}-year-old child. 
                    
                    IMPORTANT: Your conversation must be directly related to ${focus}. 

                    For example:
                    - If focus is "Literacy and Communication": Ask about words, letters, reading, writing, how to express ideas, fun facts, personal experience, social skills
                    - If focus is "STEM": Ask about counting, numeracy, how things are built, what they're made of, how they work, designing new things, scientific thinking, hypothesis, cause and effect
                    - If focus is "Creativity": Ask about imagination, art, creative expression, what they could create, design thinking
                    - If focus is "Emotional Intelligence": Ask about feelings, emotions, how characters might feel, emotional responses
                    
                    Start with a warm greeting and ask an engaging question that specifically relates to ${focus} based on what you see in the image. Keep the conversation interactive and educational within the ${focus} theme.
                    Keep your response very short and simple, suitable for a ${age}-year-old. Focus on one clear question/prompt.`;
                } else {
                    const conversationHistory = apiResponses.map(r => {
                        const isUser = r.type === 'user_message' || r.sender === 'user';
                        const content = r.candidates?.[0]?.content?.parts?.[0]?.text || r.content || '';
                        return isUser ? `Child: ${content}` : `Assistant: ${content}`;
                    }).join('\n\n');
                    
                    prompt = `Continue this conversation about the image with a strong focus on ${focus} for a ${age}-year-old child.
                    
                    IMPORTANT: Keep the conversation centered on ${focus}. Every response should relate to this focus area.
                    
                    Previous conversation:
                    ${conversationHistory}
                    
                    Child's latest response: "${actualUserMessage}"
                    
                    Child's age: ${age} years old
                    Focus: ${focus}
                    
                    Please respond naturally while keeping the conversation engaging, educational, and specifically focused on ${focus}.
                    Keep your response very short and simple, suitable for a ${age}-year-old.`;
                }
            } else {
                prompt = `Create 4-6 engaging activity suggestions based on this image for a ${age}-year-old child with a PRIMARY focus on ${focus}. 
                
                IMPORTANT: All activities must be directly related to ${focus}:
                
                - If focus is "Literacy and Communication": Activities should help identify words,learn new words, tell stories, practice speaking, understand messages, social skills
                - If focus is "STEM": Activities should involve counting, numeracy, building, problem solving, understanding mechanisms, scientific thinking, forming hypothesis, creating experiments
                - If focus is "Creativity": Activities should involve imagination, artistic expression, creative storytelling, design thinking, building, drawing, role-playing
                - If focus is "Emotional Intelligence": Activities should help identify emotions, discuss feelings, understand character emotions, practice empathy, emotional expression
                
                Please provide exactly 4-6 activities that specifically target ${focus} using what you see in the image. Each activity should be age-appropriate for ${age} years old.
                Please keep each activity short and simple, suitable for a ${age}-year-old.
                

                Format each activity with a clear title and detailed description. Use this exact format:

                Activity 1: [Title focused on ${focus}]
                [Detailed description that specifically develops ${focus} skills]

                Activity 2: [Title focused on ${focus}]  
                [Detailed description that specifically develops ${focus} skills]

                Activity 3: [Title focused on ${focus}]
                [Detailed description that specifically develops ${focus} skills]

                Activity 4: [Title focused on ${focus}]
                [Detailed description that specifically develops ${focus} skills]

                Activity 5: [Title focused on ${focus}]
                [Detailed description that specifically develops ${focus} skills]

                Activity 6: [Title focused on ${focus}]
                [Detailed description that specifically develops ${focus} skills]

                Do not use any special formatting marks, bold text, asterisks, or emojis. Keep the language clear and simple. Every activity must clearly relate to ${focus}.`;
            }
            
            console.log('🤖 Sending request to Gemini...');
            setDebugInfo('Sending request to Gemini API...');
            
            const result = await model.generateContent([prompt, image]);
            const response = result.response;
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
            
            console.log('🤖 Gemini response received:', text ? 'Success' : 'No text');
            
            if (text) {
                console.log('✅ Response successful:', text.substring(0, 100) + '...');
                setDebugInfo('Response received successfully!');
                
                const newResponse = {
                    responseId: Date.now(),
                    timestamp: new Date().toISOString(),
                    type: 'ai_response',
                    sender: 'ai',
                    userMessage: actualUserMessage,
                    candidates: [{
                        content: {
                            parts: [{ text }]
                        }
                    }]
                };
                
                setResponses(prev => [...prev, newResponse]);
                
                // Reset expanded cards for new suggestions
                if (mode === 'suggestion') {
                    setExpandedCards(new Set());
                }
                
                // Auto-play response only in voice conversation mode, not for suggestions
                if (conversationType === 'voice' && mode === 'conversation') {
                    setCurrentAIResponse(text); // Set current AI response
                    speak(text);
                }
            } else {
                console.error('❌ No text in Gemini response');
                setDebugInfo('No response text received from Gemini');
                alert('No response received from Gemini. Please try again.');
            }
            
            setInput('');
            resetTranscript(); // Also reset transcript after successful API call
            
        } catch (error) {
            console.error('❌ Gemini API Error:', error);
            setDebugInfo(`API Error: ${error.message}`);
            alert(`Error generating response: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const clearConversations = () => {
        setResponses([]);
        setCurrentAIResponse(''); // Clear current AI response
        setShowChatHistory(false); // Reset chat history visibility
        localStorage.removeItem('ai-media-conversations');
        setDebugInfo('Conversations cleared');
    };

    const clearAllData = () => {
        setResponses([]);
        setMediaFiles([]);
        setSelectedMedia(null);
        setCurrentAIResponse(''); // Clear current AI response
        setShowChatHistory(false); // Reset chat history visibility
        localStorage.removeItem('ai-media-conversations');
        localStorage.removeItem('ai-media-files');
        setDebugInfo('All data cleared');
    };

    // New state for managing chat history visibility in voice mode
    const [showChatHistory, setShowChatHistory] = useState(false);

    // Function to render chat history
    const renderChatHistory = () => {
        return (

            <div className="space-y-3 max-h-[460px] overflow-y-auto">
                {apiResponses.map((response, index) => (
                    <div key={response.responseId || index}>
                        {response.type === 'user_message' || response.sender === 'user' ? (
                            // User Message - Right aligned, blue
                            <div className="flex justify-end mb-2">
                                <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-xs shadow-sm">
                                    <div className="text-sm font-medium mb-1">You</div>
                                    <div className="text-sm">
                                        {response.candidates?.[0]?.content?.parts?.[0]?.text || response.content}
                                    </div>
                                    <div className="text-xs opacity-75 mt-1">
                                        {new Date(response.responseId || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // AI Message - Left aligned, gray
                            <div className="flex justify-start mb-2">
                                <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-2 max-w-sm shadow-sm">
                                    <div className="text-sm font-medium mb-1 text-purple-600">AI Assistant</div>
                                    <div className="text-sm prose prose-sm max-w-none">
                                        {response.candidates?.[0]?.content?.parts?.[0]?.text || response.content}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="text-xs text-gray-500">
                                            {new Date(response.responseId || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                        <button
                                            onClick={() => playResponse(response.candidates?.[0]?.content?.parts?.[0]?.text || response.content)}
                                            disabled={isSpeaking}
                                            className="ml-2 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                                        >
                                            <Volume2 className="w-3 h-3" />
                                            {isSpeaking ? 'Playing...' : 'Play'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {isGenerating && (
                    <div className="flex justify-start mb-2">
                        <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-2 max-w-xs shadow-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                <span className="text-sm">AI is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Function to render current voice transcript
    const renderCurrentVoiceTranscript = () => {
        return (

            <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {/* Current AI Response (when AI is speaking) */}
                {isSpeaking && currentAIResponse && (
                    <div className="w-full">
                        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-4 shadow-sm border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-purple-700">AI Assistant Speaking</span>
                            </div>
                            <div className="text-gray-800 leading-relaxed text-sm">
                                {currentAIResponse}
                            </div>
                        </div>
                    </div>
                )}

                {/* Current User Transcript (when user is recording or has recorded) */}
                {(isListening || (transcript && !isSpeaking && !isGenerating)) && (
                    <div className="w-full">
                        <div className="bg-gradient-to-r from-blue-100 to-green-100 rounded-2xl p-4 shadow-sm border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                {isListening ? (
                                    <>
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-medium text-red-700">Recording...</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-blue-700">Your Message</span>
                                    </>
                                )}
                            </div>
                            <div className="text-gray-800 leading-relaxed text-sm">
                                {isListening ? 
                                    "🎤 Listening... Speak now!" : 
                                    (transcript || "No speech detected")
                                }
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Thinking State */}
                {isGenerating && !isSpeaking && (
                    <div className="w-full">
                        <div className="bg-gradient-to-r from-gray-100 to-purple-100 rounded-2xl p-4 shadow-sm border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                <span className="text-sm font-medium text-purple-700">AI is thinking...</span>
                            </div>
                            <div className="text-gray-600 text-sm">
                                Processing your message and preparing a response...
                            </div>
                        </div>
                    </div>
                )}

                {/* Default state when nothing is happening */}
                {!isListening && !transcript && !isSpeaking && !isGenerating && apiResponses.length > 0 && (
                    <div className="text-center text-gray-500 py-4">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Ready for your next message</p>
                        <p className="text-xs text-gray-400">Press the microphone to continue chatting</p>
                    </div>
                )}
            </div>
        );
    };

    // Function to render the conversation content based on mode and type
    const renderConversationContent = () => {
        if (!selectedMedia) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Select an image to begin</p>
                    <p className="text-sm text-center">Choose an image from the library to start exploring activities</p>
                </div>
            );
        }

        if (apiResponses.length === 0 && !isGenerating) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    {mode === 'conversation' ? (
                        <>
                            <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
                            <p className="text-lg font-medium">Ready to chat!</p>
                            <p className="text-sm text-center">Click "Start" to begin your {focus.toLowerCase()} conversation</p>
                        </>
                    ) : (
                        <>
                            <Lightbulb className="w-16 h-16 mb-4 text-gray-300" />
                            <p className="text-lg font-medium">Generate suggestions</p>
                            <p className="text-sm text-center">Click "Generate Suggestions" to get {focus.toLowerCase()} activity ideas</p>
                        </>
                    )}
                </div>
            );
        }

        if (mode === 'conversation') {
            // Show chat history for both text and voice modes
            return renderChatHistory();
        } else {
            // Suggestion Mode - Card Layout
            return (
                <div className="w-full">
                    {apiResponses.length > 0 && (() => {
                        const lastResponse = apiResponses[apiResponses.length - 1];
                        const responseText = lastResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        const suggestionCards = parseSuggestionCards(responseText);
                        
                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {suggestionCards.map((card, index) => {
                                    const isExpanded = expandedCards.has(index);
                                    const shouldTruncate = card.description.length > 120;
                                    const displayDescription = isExpanded || !shouldTruncate 
                                        ? card.description 
                                        : truncateText(card.description);
                                    
                                    return (
                                        <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                                            onClick={() => setSelectedActivityCard(card)}>
                                            <div className="mb-2">
                                                <h3 className="font-semibold text-blue-600 text-base mb-1">{card.title}</h3>
                                            </div>
                                            <p className="text-gray-700 text-sm leading-relaxed mb-2">
                                                {displayDescription}
                                            </p>
                                            {shouldTruncate && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleCardExpansion(index);
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-700 mb-2 font-medium"
                                                >
                                                    {isExpanded ? 'Show less' : 'Show more'}
                                                </button>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        playResponse(card.title + ". " + card.description);
                                                    }}
                                                    disabled={isSpeaking}
                                                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:text-gray-400 bg-white/50 hover:bg-white/80 px-2 py-1 rounded-lg transition-all"
                                                >
                                                    <Volume2 className="w-3 h-3" />
                                                    {isSpeaking ? 'Playing...' : 'Play'}
                                                </button>
                                                <span className="text-xs text-gray-500">Click to enlarge</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                    {isGenerating && (
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-500">
                                <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                Generating {focus.toLowerCase()} suggestions...
                            </div>
                        </div>
                    )}
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Camera className="w-8 h-8 text-purple-600" />
                        AI Media Explorer
                    </h1>
                    <p className="text-gray-600 mt-1">Upload images and explore activities through AI-powered conversations</p>
                    
                    {/* Debug Information */}
                    {debugInfo && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                            <strong>Debug:</strong> {debugInfo}
                        </div>
                    )}
                    
                    {/* API Key Status */}
                    <div className="mt-2 flex gap-4 text-sm">
                        <div className={`flex items-center gap-1 ${GEMINI_API_KEY ? 'text-green-600' : 'text-red-600'}`}>
                            {GEMINI_API_KEY ? '✅' : '❌'} Gemini API
                        </div>
                        <div className={`flex items-center gap-1 ${GOOGLE_CLOUD_API_KEY ? 'text-green-600' : 'text-red-600'}`}>
                            {GOOGLE_CLOUD_API_KEY ? '✅' : '❌'} Google Cloud API
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`max-w-7xl mx-auto p-4 transition-all duration-300 ${
                sidebarCollapsed ? 'pb-4' : 'pb-4'
            }`}>
                {/* Voice Mode Layout - Image Top, Controls Below */}
                {mode === 'conversation' && conversationType === 'voice' ? (
                    <div className="space-y-4 h-[calc(100vh-8rem)]">
                        {/* Header with Toggle */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-purple-600" />
                                    AI Voice Conversation
                                </h2>
                                <div className="flex items-center gap-4">
                                    {selectedMedia && (
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">Age:</span> {age} | <span className="font-medium">Focus:</span> {focus}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all duration-200"
                                    >
                                        {sidebarCollapsed ? (
                                            <>
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </>
                                        ) : (
                                            <>
                                                <X className="w-4 h-4" />
                                                Hide Settings
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
                            {/* Large Image */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col">
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">Selected Image</h3>
                                </div>
                                <div className="flex-1 p-4">
                                    {selectedMedia ? (
                                        <>
                                            <div className="h-full rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                                                <img 
                                                    src={selectedMedia.url} 
                                                    alt={selectedMedia.name}
                                                    className="w-full h-full object-contain max-h-[60vh]"
                                                />
                                            </div>
                                            <div className="mt-3">
                                                <p className="text-sm text-gray-600 truncate">{selectedMedia.name}</p>
                                                {selectedMedia.needsReupload && (
                                                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                                                        <span role="img" aria-label="warning">⚠️</span> This image needs to be re-uploaded for AI analysis
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                            <Camera className="w-16 h-16 mb-4 text-gray-300" />
                                            <p className="text-lg font-medium">No Image Selected</p>
                                            <p className="text-sm text-center">Upload and select an image to get started</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Voice Controls & Current Transcript */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col">
                                <div className="p-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">Voice Chat</h3>
                                        {apiResponses.length > 0 && (
                                            <button
                                                onClick={() => setShowChatHistory(!showChatHistory)}
                                                className="flex items-center gap-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-all duration-200"
                                            >
                                                <Eye className="w-4 h-4" />
                                                {showChatHistory ? 'Hide History' : 'Show History'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Error Display */}
                                {(sttError || ttsError) && (
                                    <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                                        <div className="flex items-center gap-2 text-red-800 mb-1">
                                            <AlertCircle className="w-4 h-4" />
                                            <h3 className="font-medium text-sm">Voice Service Errors</h3>
                                        </div>
                                        {sttError && <p className="text-xs text-red-600">Speech-to-Text: {sttError}</p>}
                                        {ttsError && <p className="text-xs text-red-600">Text-to-Speech: {ttsError}</p>}
                                    </div>
                                )}

                                {/* Current Transcript Area */}
                                <div className="flex-1 p-4">
                                    {showChatHistory && apiResponses.length > 0 ? (
                                        <div className="h-full overflow-y-auto">
                                            {renderChatHistory()}
                                        </div>
                                    ) : (
                                        renderCurrentVoiceTranscript()
                                    )}
                                </div>

                                {/* Voice Controls */}
                                <div className="p-4 border-t border-gray-200">
                                    <div className="space-y-3">
                                        <div className="flex flex-col items-center gap-3">
                                            <button
                                                onClick={isListening ? stopRecording : startRecording}
                                                disabled={isGenerating || !selectedMedia || isSpeaking}
                                                className={`w-full px-6 py-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-3 ${
                                                    isListening 
                                                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                                                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                                                } disabled:bg-gray-400`}
                                            >
                                                {isListening ? (
                                                    <>
                                                        <MicOff className="w-5 h-5" />
                                                        Stop Recording
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mic className="w-5 h-5" />
                                                        {transcript ? 'Record New' : (apiResponses.length === 0 ? 'Start Voice Chat' : 'Record Message')}
                                                    </>
                                                )}
                                            </button>
                                            
                                            {/* Action buttons row */}
                                            <div className="flex gap-2 w-full">
                                                {/* Send button for voice mode */}
                                                {transcript && !isListening && !isGenerating && (
                                                    <button
                                                        onClick={() => {
                                                            console.log('🎤 Sending message and clearing state');
                                                            getApiResponse();
                                                            resetTranscript();
                                                            setInput('');
                                                        }}
                                                        className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                        Send
                                                    </button>
                                                )}
                                                
                                                {/* Stop AI speaking button */}
                                                {isSpeaking && (
                                                    <button
                                                        onClick={stop}
                                                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Stop AI
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Regular Layout - Side by Side */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-8rem)]">
                        
                        {/* LEFT PANEL - Selected Image */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col">
                            {/* Toggle Button Row */}
                            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-900">Selected Image</h2>
                                <div className="flex items-center gap-4">
                                    {sidebarCollapsed && selectedMedia && (
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">Age:</span> {age} | <span className="font-medium">Focus:</span> {focus}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all duration-200"
                                    >
                                        {sidebarCollapsed ? (
                                            <>
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </>
                                        ) : (
                                            <>
                                                <X className="w-4 h-4" />
                                                Hide
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Selected Image Content */}
                            <div className="flex-1 p-4 flex flex-col">
                                {selectedMedia ? (
                                    <>
                                        <div className="flex-1 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                                            <img 
                                                src={selectedMedia.url} 
                                                alt={selectedMedia.name}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="mt-3">
                                            <p className="text-sm text-gray-600 truncate">{selectedMedia.name}</p>
                                            {selectedMedia.needsReupload && (
                                                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                                                    <span role="img" aria-label="warning">⚠️</span> This image needs to be re-uploaded for AI analysis
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                                        <Camera className="w-16 h-16 mb-4 text-gray-300" />
                                        <p className="text-lg font-medium">No Image Selected</p>
                                        <p className="text-sm text-center">Upload and select an image from the controls below to get started</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT PANEL - Conversation/Suggestions */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        {mode === 'conversation' ? (
                                            <>
                                                <MessageCircle className="w-5 h-5 text-purple-600" />
                                                AI Conversation
                                            </>
                                        ) : (
                                            <>
                                                <Lightbulb className="w-5 h-5 text-purple-600" />
                                                Activity Suggestions
                                            </>
                                        )}
                                    </h2>
                                    {apiResponses.length > 0 && (
                                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                            {apiResponses.length} saved
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Error Display */}
                            {(sttError || ttsError) && (
                                <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 text-red-800 mb-1">
                                        <AlertCircle className="w-4 h-4" />
                                        <h3 className="font-medium text-sm">Voice Service Errors</h3>
                                    </div>
                                    {sttError && <p className="text-xs text-red-600">Speech-to-Text: {sttError}</p>}
                                    {ttsError && <p className="text-xs text-red-600">Text-to-Speech: {ttsError}</p>}
                                </div>
                            )}

                            {/* Speech Control - Stop Button */}
                            {isSpeaking && conversationType !== 'voice' && (
                                <div className="mx-4 mt-4 bg-orange-50 border border-orange-200 rounded-xl p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-orange-800">
                                            <Volume2 className="w-4 h-4" />
                                            <span className="font-medium text-sm">Playing audio...</span>
                                        </div>
                                        <button
                                            onClick={stop}
                                            className="flex items-center gap-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all duration-200"
                                        >
                                            <X className="w-3 h-3" />
                                            Stop
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Content Area */}
                            <div className="flex-1 p-4 overflow-y-auto">
                                {renderConversationContent()}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-gray-200">
                                {mode === 'conversation' ? (
                                    // Text Input (voice mode handled above)
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={apiInput}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Type your message..."
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            onKeyPress={(e) => e.key === 'Enter' && !isGenerating && getApiResponse()}
                                            disabled={isGenerating}
                                        />
                                        <button
                                            onClick={() => getApiResponse()}
                                            disabled={isGenerating || !selectedMedia}
                                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                                        >
                                            <Send className="w-4 h-4" />
                                            {apiResponses.length === 0 ? 'Start' : 'Send'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => getApiResponse()}
                                        disabled={isGenerating || !selectedMedia}
                                        className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                        <Lightbulb className="w-5 h-5" />
                                        {isGenerating ? 'Generating...' : 'Generate Suggestions'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* BOTTOM PANEL - Collapsible Controls */}
            {!sidebarCollapsed && (
                <div className="border-t bg-white">
                    <div className="max-w-7xl mx-auto p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            
                            {/* Upload Section */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-purple-600" />
                                    Upload Media
                                </h3>
                                
                                <label className="relative group cursor-pointer">
                                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 text-center transition-all duration-200 hover:border-purple-400 hover:bg-purple-50">
                                        <Plus className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                                        <p className="text-purple-600 font-medium text-xs">Click to upload</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        multiple 
                                        onChange={uploadMedia}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {/* Media Library */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-purple-600" />
                                    Media Library ({mediaFiles.length})
                                </h3>
                                
                                {mediaFiles.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500">
                                        <p className="text-xs">No images uploaded</p>
                                    </div>
                                ) : (

                                    <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto">
                                        {mediaFiles.map((file) => (
                                            <div 
                                                key={file.id} 
                                                className={`relative group cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${
                                                    selectedMedia?.id === file.id 
                                                        ? 'ring-2 ring-purple-400 ring-offset-1' 
                                                        : 'hover:scale-105'
                                                } ${file.needsReupload ? 'opacity-50' : ''}`}
                                                onClick={() => !file.needsReupload && selectMedia(file)}
                                            >
                                                <img 
                                                    src={file.url} 
                                                    alt={file.name} 
                                                    className="w-full h-16 object-cover"
                                                />
                                                {file.needsReupload && (
                                                    <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center">
                                                        <div className="text-xs text-red-700 font-bold text-center p-1">
                                                            Re-upload
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteMedia(file.id);
                                                    }}
                                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Configuration */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-purple-600" />
                                    Configuration
                                </h3>
                                
                                <div className="space-y-3">
                                    {/* Age Input */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Child's Age</label>
                                        <input 
                                            type="number" 
                                            value={age} 
                                            onChange={(e) => setAge(e.target.value)}
                                            placeholder="Age..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Focus Selection */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Focus Area</label>
                                        <div className="space-y-1">
                                            {focusChoices.map((choice) => (
                                                <label key={choice.value} className="flex items-center cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="focus" 
                                                        value={choice.value} 
                                                        checked={focus === choice.value}
                                                        onChange={(e) => setFocus(e.target.value)}
                                                        className="mr-2 text-purple-600"
                                                    />
                                                    <span className="text-xs">{choice.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Mode Selection */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={conversation}
                                                className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all duration-200 ${
                                                    mode === 'conversation'
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                            >
                                                Chat
                                            </button>
                                            <button
                                                onClick={suggestion}
                                                className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all duration-200 ${
                                                    mode === 'suggestion'
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                            >
                                                Ideas
                                            </button>
                                        </div>

                                        {/* Conversation Type */}
                                        {mode === 'conversation' && (
                                            <div className="mt-2">
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setConversationType('text');
                                                            resetTranscript();
                                                            setCurrentAIResponse('');
                                                            setShowChatHistory(false);
                                                        }}
                                                        className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all duration-200 ${
                                                            conversationType === 'text'
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                        }`}
                                                    >
                                                        Text
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setConversationType('voice');
                                                            setInput('');
                                                            setCurrentAIResponse('');
                                                            setShowChatHistory(false);
                                                        }}
                                                        className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all duration-200 ${
                                                            conversationType === 'voice'
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                        }`}
                                                    >
                                                        Voice
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Data Management */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Data Management</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={saveConversationToFile}
                                        disabled={apiResponses.length === 0}
                                        className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-all duration-200"
                                    >
                                        📄 Download JSON
                                    </button>
                                    <button
                                        onClick={saveImageToFile}
                                        disabled={!selectedMedia}
                                        className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-all duration-200"
                                    >
                                        🖼️ Save Image
                                    </button>
                                    <button
                                        onClick={clearConversations}
                                        className="w-full px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-medium transition-all duration-200"
                                    >
                                        🧹 Clear Chat
                                    </button>
                                    <button
                                        onClick={clearAllData}
                                        className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-all duration-200"
                                    >
                                        🗑️ Clear All
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Card Modal */}
            {selectedActivityCard && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                     onClick={() => setSelectedActivityCard(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                         onClick={(e) => e.stopPropagation()}>
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-bold text-blue-600">{selectedActivityCard.title}</h2>
                                <button
                                    onClick={() => setSelectedActivityCard(null)}
                                    className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="prose prose-lg max-w-none">
                                <p className="text-gray-700 leading-relaxed text-lg">{selectedActivityCard.description}</p>
                            </div>
                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={() => playResponse(selectedActivityCard.title + ". " + selectedActivityCard.description)}
                                    disabled={isSpeaking}
                                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-all duration-200"
                                >
                                    <Volume2 className="w-5 h-5" />
                                    {isSpeaking ? 'Playing...' : 'Play Activity'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaLibraryInterface;
