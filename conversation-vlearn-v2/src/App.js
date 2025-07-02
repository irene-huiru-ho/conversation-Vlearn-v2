import React from 'react';
import { useState, useEffect } from "react";
import { Upload, X, MessageCircle, Lightbulb, Send, Camera, Settings, Trash2, Plus, Mic, MicOff, Type, Volume2, AlertCircle, Eye, Palette, Hash, HelpCircle } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Enhanced Google Cloud Speech-to-Text Hook with better error handling
const useGoogleSpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  const startListening = async () => {
    try {
      console.log('🎤 Starting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      setMediaRecorder(recorder);
      setAudioChunks([]);
      setIsListening(true);
      setError(null);
      console.log('🎤 Microphone access granted, starting recording...');
      
      recorder.ondataavailable = (event) => {
        console.log('🎤 Audio data received:', event.data.size, 'bytes');
        setAudioChunks(prev => [...prev, event.data]);
      };
      
      recorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        console.log('🎤 Audio blob created:', audioBlob.size, 'bytes');
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
    } catch (err) {
      console.error('🎤 Microphone access error:', err);
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

  const speak = async (text) => {
    const apiKey = process.env.REACT_APP_GOOGLE_CLOUD_API_KEY;
    
    if (!apiKey) {
      setError('Google Cloud API key not found. Check your .env file.');
      console.error('❌ Google Cloud API key missing for TTS');
      return;
    }

    try {
      console.log('🔊 Starting text-to-speech for:', text.substring(0, 50) + '...');
      setIsSpeaking(true);
      setError(null);

      const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Wavenet-F',
            ssmlGender: 'FEMALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
          },
        }),
      });

      console.log('🔊 TTS API response status:', response.status);
      const result = await response.json();
      
      if (result.audioContent) {
        console.log('✅ TTS successful, playing audio...');
        const audio = new Audio(`data:audio/mp3;base64,${result.audioContent}`);
        audio.onended = () => {
          console.log('🔊 Audio playback finished');
          setIsSpeaking(false);
        };
        audio.onerror = (err) => {
          console.error('🔊 Audio playback error:', err);
          setError('Audio playback failed');
          setIsSpeaking(false);
        };
        await audio.play();
      } else {
        console.error('❌ No audio content in TTS response:', result);
        setError('Text-to-speech failed: No audio content received');
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error('❌ TTS error:', err);
      setError(`Text-to-speech failed: ${err.message}`);
      setIsSpeaking(false);
    }
  };

  const stop = () => {
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

    // Google Cloud Voice hooks
    const { isListening, transcript, startListening, stopListening, resetTranscript, error: sttError } = useGoogleSpeechToText();
    const { speak, isSpeaking, error: ttsError } = useGoogleTextToSpeech();

    const focusChoices = [
        { value: "Learning and Education", label: "Learning & Education", icon: <span role="img" aria-label="books">📚</span> },
        { value: "Creativity", label: "Creativity", icon: <span role="img" aria-label="art">🎨</span> },
        { value: "Emotion Intelligence", label: "Emotional Intelligence", icon: <span role="img" aria-label="heart">❤️</span> },
    ];

    // Conversation starters
    const conversationStarters = {
        text: [
            "What do you see in this picture?",
            "Can you tell me about the colors in this image?", 
            "What's your favorite thing in this picture?",
            "What do you think is happening here?",
            "Can you count the items you see?"
        ],
        voice: [
            "Hi there! Let's talk about this picture together!",
            "What catches your eye first in this image?",
            "I see something interesting here, what do you notice?",
            "Let's explore this picture together - what do you see?",
            "This looks like a fun picture to discuss!"
        ]
    };

    // Load saved data on component mount
    useEffect(() => {
        const savedConversations = localStorage.getItem('ai-media-conversations');
        const savedMediaFiles = localStorage.getItem('ai-media-files');
        
        if (savedConversations) {
            try {
                setResponses(JSON.parse(savedConversations));
            } catch (err) {
                console.error('Error loading saved conversations:', err);
            }
        }
        
        if (savedMediaFiles) {
            try {
                const parsed = JSON.parse(savedMediaFiles);
                // Note: These will be metadata only, actual File objects need to be re-uploaded
                const mediaWithWarning = parsed.map(file => ({
                    ...file,
                    file: null, // File object not available after refresh
                    needsReupload: true
                }));
                setMediaFiles(mediaWithWarning);
            } catch (err) {
                console.error('Error loading saved media files:', err);
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
        setResponses([]);
        setMode('conversation');
        setConversationType('text');
        setInput('');
    };

    const suggestion = () => {
        setResponses([]);
        setMode('suggestion');
        setInput('');
    };

    // Voice recording functions with improved flow
    const startRecording = async () => {
        resetTranscript();
        await startListening();
    };

    const stopRecording = async () => {
        stopListening();
        // Note: transcript will be processed in useEffect below
    };

    // Auto-send voice transcript when it's ready
    useEffect(() => {
        if (transcript && conversationType === 'voice' && !isListening && !isGenerating) {
            // Auto-send the transcript to Gemini after a short delay
            const timer = setTimeout(() => {
                if (transcript && !isGenerating) {
                    getApiResponse(transcript);
                }
            }, 1000); // 1 second delay to allow user to see transcript

            return () => clearTimeout(timer);
        }
    }, [transcript, conversationType, isListening, isGenerating]);

    const playResponse = (text) => {
        speak(text);
    };

    // Update input when transcript changes
    useEffect(() => {
        if (transcript && conversationType === 'voice') {
            setInput(transcript);
        }
    }, [transcript, conversationType]);
    
    // Function to use conversation starter
    const handleConversationStarter = (starter) => {
        if (conversationType === 'text') {
            setInput(starter);
        } else {
            // For voice mode, directly send the starter
            getApiResponse(starter);
        }
    };

    // Function to parse suggestions into cards
    const parseSuggestionCards = (text) => {
        // Try to extract activity suggestions from the text
        const lines = text.split('\n').filter(line => line.trim());
        const cards = [];
        
        let currentCard = null;
        
        for (let line of lines) {
            // Skip headers and empty lines
            if (line.startsWith('#') || line.trim() === '') continue;
            
            // Look for activity titles (usually start with numbers or **bold**)
            if (line.match(/^\*\*\d+\.\s*(.+?)\*\*/) || line.match(/^\d+\.\s*\*\*(.+?)\*\*/)) {
                // Save previous card if exists
                if (currentCard) {
                    cards.push(currentCard);
                }
                
                // Extract title
                const titleMatch = line.match(/\*\*(.+?)\*\*/) || [null, line.replace(/^\d+\.\s*/, '')];
                currentCard = {
                    title: titleMatch[1] || 'Activity',
                    description: '',
                    icon: getActivityIcon(titleMatch[1] || 'Activity')
                };
            } else if (currentCard && line.trim()) {
                // Add to description
                currentCard.description += (currentCard.description ? ' ' : '') + line.trim();
            }
        }
        
        // Add last card
        if (currentCard) {
            cards.push(currentCard);
        }
        
        // If no cards found, create generic ones
        if (cards.length === 0) {
            return [
                {
                    title: "Creative Activity",
                    description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
                    icon: "🎨"
                }
            ];
        }
        
        return cards;
    };

    const getActivityIcon = (title) => {
        const titleLower = title.toLowerCase();
        if (titleLower.includes('spy') || titleLower.includes('find') || titleLower.includes('look')) return "👁️";
        if (titleLower.includes('color') || titleLower.includes('paint')) return "🎨";
        if (titleLower.includes('count') || titleLower.includes('number')) return "🔢";
        if (titleLower.includes('story') || titleLower.includes('tell')) return "📖";
        if (titleLower.includes('move') || titleLower.includes('dance')) return "💃";
        if (titleLower.includes('sound') || titleLower.includes('music')) return "🎵";
        if (titleLower.includes('draw') || titleLower.includes('create')) return "✏️";
        if (titleLower.includes('missing') || titleLower.includes('imagine')) return "❓";
        return "🌟";
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
                    prompt = `Begin a conversation about activities that can be found within this image, taking into consideration the child's age: ${age} years old, and the focus: ${focus}. 
                    
                    Please start with a warm greeting and ask an engaging question about what they see in the image. Keep the conversation interactive and educational.`;
                } else {
                    const conversationHistory = apiResponses.map(r => {
                        const isUser = r.type === 'user_message' || r.sender === 'user';
                        const content = r.candidates?.[0]?.content?.parts?.[0]?.text || r.content || '';
                        return isUser ? `Child: ${content}` : `Assistant: ${content}`;
                    }).join('\n\n');
                    
                    prompt = `Continue this conversation about the image. 
                    
                    Previous conversation:
                    ${conversationHistory}
                    
                    Child's latest response: "${actualUserMessage}"
                    
                    Child's age: ${age} years old
                    Focus: ${focus}
                    
                    Please respond naturally and keep the conversation engaging and educational.`;
                }
            } else {
                prompt = `Create engaging activity suggestions based on this image for a ${age}-year-old child with a focus on ${focus}. 
                
                Please format EXACTLY as follows:

                **1. I Spy Game**
                Play 'I spy with my little eye' using things in the picture!

                **2. Color Hunt**
                Find and name all the different colors you can see!

                **3. Count Together**
                Count how many things you can find in the picture!

                **4. What's Missing?**
                Imagine what might be just outside the picture!

                Make sure each activity is age-appropriate and aligns with the focus area. Always include these 4 specific activities formatted exactly as shown.`;
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
                
                // Auto-play response in voice mode
                if (conversationType === 'voice') {
                    speak(text);
                }
            } else {
                console.error('❌ No text in Gemini response');
                setDebugInfo('No response text received from Gemini');
                alert('No response received from Gemini. Please try again.');
            }
            
            setInput('');
            
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
        localStorage.removeItem('ai-media-conversations');
        setDebugInfo('Conversations cleared');
    };

    const clearAllData = () => {
        setResponses([]);
        setMediaFiles([]);
        setSelectedMedia(null);
        localStorage.removeItem('ai-media-conversations');
        localStorage.removeItem('ai-media-files');
        setDebugInfo('All data cleared');
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

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Panel - Media Library */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Upload Section */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Upload className="w-5 h-5 text-purple-600" />
                            Upload Media
                        </h2>
                        
                        <label className="relative group cursor-pointer">
                            <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center transition-all duration-200 hover:border-purple-400 hover:bg-purple-50 group-hover:scale-[1.02]">
                                <Plus className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                                <p className="text-purple-600 font-medium">Click to upload images</p>
                                <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
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
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Camera className="w-5 h-5 text-purple-600" />
                                Media Library
                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full ml-auto">
                                    {mediaFiles.length}
                                </span>
                            </h2>
                        </div>
                        
                        {mediaFiles.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Camera className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>No images uploaded yet</p>
                                <p className="text-xs mt-1">Image metadata persists after refresh, but files need re-upload for AI analysis</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {mediaFiles.map((file) => (
                                    <div 
                                        key={file.id} 
                                        className={`relative group cursor-pointer rounded-xl overflow-hidden transition-all duration-200 ${
                                            selectedMedia?.id === file.id 
                                                ? 'ring-4 ring-purple-400 ring-offset-2 scale-105' 
                                                : 'hover:scale-105'
                                        } ${file.needsReupload ? 'opacity-50' : ''}`}
                                        onClick={() => !file.needsReupload && selectMedia(file)}
                                    >
                                        <img 
                                            src={file.url} 
                                            alt={file.name} 
                                            className="w-full h-24 object-cover"
                                        />
                                        {file.needsReupload && (
                                            <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center">
                                                <div className="text-xs text-red-700 font-bold text-center p-1">
                                                    Re-upload needed
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteMedia(file.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Image Preview */}
                    {selectedMedia && (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Image</h2>
                            <div className="rounded-xl overflow-hidden">
                                <img 
                                    src={selectedMedia.url} 
                                    alt={selectedMedia.name}
                                    className="w-full h-48 object-cover"
                                />
                            </div>
                            <p className="text-sm text-gray-600 mt-3 truncate">{selectedMedia.name}</p>
                            {selectedMedia.needsReupload && (
                                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                                    <span role="img" aria-label="warning">⚠️</span> This image needs to be re-uploaded for AI analysis
                                </div>
                            )}
                        </div>
                    )}

                    {/* Data Management */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h2>
                        <div className="space-y-2">
                            <button
                                onClick={saveConversationToFile}
                                disabled={apiResponses.length === 0}
                                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                <span role="img" aria-label="document">📄</span> Download Conversation JSON
                            </button>
                            <button
                                onClick={saveImageToFile}
                                disabled={!selectedMedia}
                                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                <span role="img" aria-label="picture">🖼️</span> Save Selected Image
                            </button>
                            <button
                                onClick={clearConversations}
                                className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                <span role="img" aria-label="broom">🧹</span> Clear Conversations
                            </button>
                            <button
                                onClick={clearAllData}
                                className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                <span role="img" aria-label="trash">🗑️</span> Clear All Data
                            </button>
                        </div>
                        <div className="mt-3 text-xs text-gray-500 space-y-1">
                            <p><span role="img" aria-label="floppy disk">💾</span> Conversations auto-save locally</p>
                            <p><span role="img" aria-label="folder">📁</span> JSON auto-downloads ONLY on browser close/refresh</p>
                            <p><span role="img" aria-label="click">👆</span> Click "Download" for manual export</p>
                            <p><span role="img" aria-label="warning">⚠️</span> Images need re-upload after page refresh</p>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Configuration and Results */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Configuration */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-purple-600" />
                            Configuration
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Age Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Child's Age
                                </label>
                                <input 
                                    type="number" 
                                    value={age} 
                                    onChange={(e) => setAge(e.target.value)}
                                    placeholder="Enter age..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>

                            {/* Focus Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Focus Area
                                </label>
                                <div className="space-y-2">
                                    {focusChoices.map((choice) => (
                                        <label key={choice.value} className="flex items-center cursor-pointer group">
                                            <input 
                                                type="radio" 
                                                name="focus" 
                                                value={choice.value} 
                                                checked={focus === choice.value}
                                                onChange={(e) => setFocus(e.target.value)}
                                                className="mr-3 text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="flex items-center gap-2 group-hover:text-purple-600 transition-colors">
                                                <span className="text-lg">{choice.icon}</span>
                                                {choice.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Mode Selection */}
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Interaction Mode
                            </label>
                            <div className="flex gap-3">
                                <button
                                    onClick={conversation}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                                        mode === 'conversation'
                                            ? 'bg-purple-600 text-white shadow-lg scale-105'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    Conversation
                                </button>
                                <button
                                    onClick={suggestion}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                                        mode === 'suggestion'
                                            ? 'bg-purple-600 text-white shadow-lg scale-105'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <Lightbulb className="w-5 h-5" />
                                    Suggestions
                                </button>
                            </div>

                            {/* Conversation Type Selection */}
                            {mode === 'conversation' && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Conversation Type
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setConversationType('text')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
                                                conversationType === 'text'
                                                    ? 'bg-blue-500 text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            <Type className="w-4 h-4" />
                                            Text Chat
                                        </button>
                                        <button
                                            onClick={() => setConversationType('voice')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
                                                conversationType === 'voice'
                                                    ? 'bg-blue-500 text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            <Mic className="w-4 h-4" />
                                            Voice Chat
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Conversation Starters */}
                    {mode === 'conversation' && selectedMedia && apiResponses.length === 0 && !isGenerating && (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-blue-600" />
                                Conversation Starters
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {conversationStarters[conversationType].map((starter, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleConversationStarter(starter)}
                                        className="text-left p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all duration-200 text-sm text-blue-800 hover:text-blue-900"
                                    >
                                        💭 {starter}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {(sttError || ttsError) && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 text-red-800 mb-2">
                                <AlertCircle className="w-5 h-5" />
                                <h3 className="font-medium">Voice Service Errors</h3>
                            </div>
                            {sttError && <p className="text-sm text-red-600">Speech-to-Text: {sttError}</p>}
                            {ttsError && <p className="text-sm text-red-600">Text-to-Speech: {ttsError}</p>}
                        </div>
                    )}

                    {/* AI Response Area */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 min-h-[400px] flex flex-col">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
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
                                {apiResponses.length > 0 && (
                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full ml-auto">
                                        {apiResponses.length} saved
                                    </span>
                                )}
                            </h2>
                        </div>

                        <div className="flex-1 p-6">
                            {!selectedMedia ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <Camera className="w-16 h-16 mb-4 text-gray-300" />
                                    <p className="text-lg font-medium">Select an image to begin</p>
                                    <p className="text-sm">Choose an image from your library to start exploring activities</p>
                                </div>
                            ) : apiResponses.length === 0 && !isGenerating ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    {mode === 'conversation' ? (
                                        <>
                                            <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
                                            <p className="text-lg font-medium">Ready to chat!</p>
                                            <p className="text-sm">Use a conversation starter or click "Start" to begin</p>
                                        </>
                                    ) : (
                                        <>
                                            <Lightbulb className="w-16 h-16 mb-4 text-gray-300" />
                                            <p className="text-lg font-medium">Generate suggestions</p>
                                            <p className="text-sm">Click "Generate Suggestions" to get activity ideas</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {mode === 'conversation' ? (
                                        // Conversation Mode - Show full back-and-forth conversation
                                        <div className="space-y-3 max-h-64 overflow-y-auto">
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
                                                            <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-2 max-w-xs shadow-sm">
                                                                <div className="text-sm font-medium mb-1 text-purple-600">AI Assistant</div>
                                                                <div className="text-sm prose prose-sm max-w-none">
                                                                    {response.candidates?.[0]?.content?.parts?.[0]?.text || response.content}
                                                                </div>
                                                                <div className="flex items-center justify-between mt-2">
                                                                    <div className="text-xs text-gray-500">
                                                                        {new Date(response.responseId || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                    </div>
                                                                    {conversationType === 'voice' && (
                                                                        <button
                                                                            onClick={() => playResponse(response.candidates?.[0]?.content?.parts?.[0]?.text || response.content)}
                                                                            disabled={isSpeaking}
                                                                            className="ml-2 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                                                                        >
                                                                            <Volume2 className="w-3 h-3" />
                                                                            {isSpeaking ? 'Playing...' : 'Play'}
                                                                        </button>
                                                                    )}
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
                                    ) : (
                                        // Suggestion Mode - Card Layout
                                        <div className="max-h-64 overflow-y-auto">
                                            {apiResponses.length > 0 && (() => {
                                                const lastResponse = apiResponses[apiResponses.length - 1];
                                                const responseText = lastResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                                const suggestionCards = parseSuggestionCards(responseText);
                                                
                                                return (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {suggestionCards.map((card, index) => (
                                                            <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-200">
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <span className="text-2xl">{card.icon}</span>
                                                                    <h3 className="font-semibold text-blue-600 text-lg">{card.title}</h3>
                                                                </div>
                                                                <p className="text-gray-700 text-sm leading-relaxed">{card.description}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                            {isGenerating && (
                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                                        Generating suggestions...
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-gray-200">
                            {mode === 'conversation' ? (
                                conversationType === 'text' ? (
                                    // Text Input
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
                                    // Voice Input - Auto-send when recording stops
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={isListening ? stopRecording : startRecording}
                                                disabled={isGenerating || !selectedMedia}
                                                className={`px-8 py-4 rounded-full font-medium transition-all duration-200 flex items-center gap-3 ${
                                                    isListening 
                                                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                                                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                                                } disabled:bg-gray-400`}
                                            >
                                                {isListening ? (
                                                    <>
                                                        <MicOff className="w-5 h-5" />
                                                        Click to Stop
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mic className="w-5 h-5" />
                                                        {apiResponses.length === 0 ? 'Start Voice Chat' : 'Record Message'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        
                                        {isListening && (
                                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                <span role="img" aria-label="microphone">🎤</span> Recording... Click "Click to Stop" when finished
                                            </div>
                                        )}
                                        
                                        {transcript && !isListening && (
                                            <div className="bg-blue-50 rounded-lg p-4 max-w-md border border-blue-200">
                                                <div className="text-sm font-medium text-blue-800 mb-1">
                                                    <span role="img" aria-label="microphone">🎤</span> Your Message (Auto-sending in 1 second...):
                                                </div>
                                                <div className="text-sm text-blue-700">{transcript}</div>
                                                <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                                                    <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full"></div>
                                                    Sending to AI...
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!isListening && !transcript && apiResponses.length > 0 && (
                                            <div className="text-sm text-gray-500 text-center">
                                                <span role="img" aria-label="microphone">🎤</span> Click the microphone to continue the conversation
                                            </div>
                                        )}
                                    </div>
                                )
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
            </div>
        </div>
    );
};

export default MediaLibraryInterface;