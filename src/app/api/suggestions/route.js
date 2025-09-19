/**
 * Suggestions API Route
 * 
 * Handles task suggestion requests with:
 * - User limit checking (20 free suggestions per user)
 * - Cached suggestion lookup
 * - OpenAI API integration for generating new suggestions
 * - Suggestion storage in Firebase
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FREE_SUGGESTIONS = 20;

export async function POST(request) {
    try {
        const {
            userId,
            taskName,
            taskType,
            taskDescription,
            taskStatus,
            dueDate,
            createdAt,
            completedAt,
            isOverdue,
            daysSinceCreated,
            daysUntilDue,
            hasDescription,
            hasDueDate,
            taskAge,
            urgencyLevel
        } = await request.json();

        if (!userId || !taskName) {
            return NextResponse.json(
                { error: 'User ID and task name are required' },
                { status: 400 }
            );
        }

        // Check user's suggestion count
        const userStatsRef = doc(db, 'userStats', userId);
        const userStatsSnap = await getDoc(userStatsRef);

        let suggestionCount = 0;
        if (userStatsSnap.exists()) {
            suggestionCount = userStatsSnap.data().suggestionCount || 0;
        }

        // Check if user has reached the limit
        if (suggestionCount >= MAX_FREE_SUGGESTIONS) {
            return NextResponse.json({
                error: 'LIMIT_REACHED',
                message: "You've reached your free suggestions limit of 20 suggestions.",
                count: suggestionCount,
                limit: MAX_FREE_SUGGESTIONS
            }, { status: 429 });
        }

        // Always generate fresh suggestion using OpenAI (skip caching)
        const prompt = generatePrompt({
            taskName,
            taskType,
            taskDescription,
            taskStatus,
            dueDate,
            createdAt,
            completedAt,
            isOverdue,
            daysSinceCreated,
            daysUntilDue,
            hasDescription,
            hasDueDate,
            taskAge,
            urgencyLevel
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Using the cheapest GPT-4 model
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that provides motivational and engaging suggestions for task completion. Keep responses short, positive, and actionable. Vary between fun facts, productivity tips, and motivational messages. Always provide unique and varied responses."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 100, // Reduced from 150 to minimize cost
            temperature: 0.9,
        });

        const suggestionContent = completion.choices[0]?.message?.content?.trim();

        if (!suggestionContent) {
            return NextResponse.json(
                { error: 'Failed to generate suggestion' },
                { status: 500 }
            );
        }

        // Optional: Store the new suggestion in the database for analytics
        const suggestionId = doc(collection(db, 'suggestions')).id;
        await setDoc(doc(db, 'suggestions', suggestionId), {
            taskName: taskName,
            taskNameLower: taskName.toLowerCase().trim(),
            taskType: taskType || 'task',
            content: suggestionContent,
            createdAt: serverTimestamp(),
            createdBy: userId,
            usageCount: 1,
            isFromCache: false
        });

        // Update user's suggestion count
        if (userStatsSnap.exists()) {
            await updateDoc(userStatsRef, {
                suggestionCount: suggestionCount + 1,
                lastSuggestionAt: serverTimestamp()
            });
        } else {
            await setDoc(userStatsRef, {
                suggestionCount: 1,
                lastSuggestionAt: serverTimestamp(),
                createdAt: serverTimestamp()
            });
        }

        return NextResponse.json({
            suggestion: suggestionContent,
            isFromCache: false, // Always false now
            remainingCount: MAX_FREE_SUGGESTIONS - (suggestionCount + 1)
        });

    } catch (error) {
        console.error('Error in suggestions API:', error);

        if (error.code === 'insufficient_quota') {
            return NextResponse.json(
                { error: 'OpenAI API quota exceeded' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

function generatePrompt(taskData) {
    const {
        taskName,
        taskType,
        taskDescription,
        taskStatus,
        dueDate,
        isOverdue,
        daysSinceCreated,
        daysUntilDue,
        urgencyLevel
    } = taskData;

    const currentTime = new Date().getTime();

    // Build comprehensive context from all available task information
    let taskContext = `Task: "${taskName}"`;
    if (taskDescription) {
        taskContext += `\nDescription: "${taskDescription}"`;
    }
    taskContext += `\nType: ${taskType || 'task'}`;
    taskContext += `\nStatus: ${taskStatus || 'pending'}`;

    // Add date and urgency context
    if (dueDate) {
        const dueDateStr = new Date(dueDate).toLocaleDateString();
        taskContext += `\nDue Date: ${dueDateStr}`;
    }

    if (urgencyLevel) {
        taskContext += `\nUrgency: ${urgencyLevel}`;
    }

    if (daysSinceCreated !== undefined && daysSinceCreated >= 0) {
        taskContext += `\nAge: ${daysSinceCreated} day(s) old`;
    }

    if (daysUntilDue !== null) {
        if (daysUntilDue < 0) {
            taskContext += `\nOverdue by ${Math.abs(daysUntilDue)} day(s)`;
        } else if (daysUntilDue === 0) {
            taskContext += `\nDue TODAY`;
        } else {
            taskContext += `\nDue in ${daysUntilDue} day(s)`;
        }
    }

    // Enhanced prompts based on urgency and status
    const urgencyBasedPrompts = {
        'overdue': [
            `This task is OVERDUE: ${taskContext}. Provide urgent motivation to tackle it NOW.`,
            `Give powerful encouragement to handle this overdue task: ${taskContext}. Focus on getting back on track.`,
            `Share strategies for catching up on: ${taskContext}. Make it action-oriented.`
        ],
        'urgent': [
            `This task is due very soon: ${taskContext}. Provide focused motivation to complete it quickly.`,
            `Give time-sensitive encouragement for: ${taskContext}. Focus on efficient completion.`,
            `Share sprint-mode advice for: ${taskContext}. Keep it energizing.`
        ],
        'soon': [
            `This task is due soon: ${taskContext}. Provide steady motivation to stay on track.`,
            `Give deadline-aware encouragement for: ${taskContext}. Balance pace and quality.`,
            `Share planning wisdom for: ${taskContext}. Include time management tips.`
        ],
        'normal': [
            `Provide thoughtful motivation for: ${taskContext}. Focus on sustainable progress.`,
            `Share quality-focused encouragement for: ${taskContext}. Balance excellence and progress.`,
            `Give strategic advice for: ${taskContext}. Include long-term thinking.`
        ]
    };

    const statusBasedPrompts = {
        'pending': [
            `Give me motivation to start working on this task: ${taskContext}. Focus on getting started.`,
            `Share a kickstart strategy for: ${taskContext}. Make it energizing.`,
            `What's a good first step approach for: ${taskContext}? Be encouraging.`
        ],
        'in-progress': [
            `Help me stay focused on this ongoing task: ${taskContext}. Provide momentum tips.`,
            `Give me encouragement to push through: ${taskContext}. Focus on persistence.`,
            `Share a progress-boosting strategy for: ${taskContext}. Keep it motivational.`
        ],
        'completed': [
            `Celebrate the completion of: ${taskContext}. Share insights about this achievement.`,
            `Reflect on the success of completing: ${taskContext}. What can be learned?`,
            `Acknowledge the accomplishment: ${taskContext}. Provide future motivation.`
        ]
    };

    const typeBasedPrompts = {
        'task': [
            `Provide unique motivation for: ${taskContext}. Make it inspiring and actionable.`,
            `Share a productivity insight about: ${taskContext}. Keep it engaging.`,
            `Give creative encouragement for: ${taskContext}. Be original.`,
            `What's a smart approach to: ${taskContext}? Include a motivational twist.`
        ],
        'bug': [
            `Give debugging motivation for: ${taskContext}. Include problem-solving mindset.`,
            `Share a detective approach to: ${taskContext}. Make it engaging.`,
            `Provide bug-fixing encouragement for: ${taskContext}. Focus on resilience.`,
            `What's the silver lining in fixing: ${taskContext}? Be uplifting.`
        ],
        'feature': [
            `Inspire me to build: ${taskContext}. Focus on user impact and vision.`,
            `Share development motivation for: ${taskContext}. Make it innovative.`,
            `Give creative building energy for: ${taskContext}. Include success vision.`,
            `What's exciting about creating: ${taskContext}? Be visionary.`
        ],
        'improvement': [
            `Motivate me to enhance: ${taskContext}. Focus on growth and efficiency.`,
            `Share optimization wisdom for: ${taskContext}. Make it actionable.`,
            `Give refinement encouragement for: ${taskContext}. Include benefits.`,
            `What's the hidden value in improving: ${taskContext}? Be compelling.`
        ]
    };

    // Prioritize urgency-based prompts, then combine with status and type
    const urgencyPrompts = urgencyBasedPrompts[urgencyLevel] || [];
    const statusPrompts = statusBasedPrompts[taskStatus] || [];
    const typePrompts = typeBasedPrompts[taskType] || typeBasedPrompts['task'];

    // Weight urgency prompts more heavily if task is urgent or overdue
    let allPrompts = [];
    if (urgencyLevel === 'overdue' || urgencyLevel === 'urgent') {
        allPrompts = [...urgencyPrompts, ...urgencyPrompts, ...statusPrompts, ...typePrompts]; // Double weight for urgent
    } else {
        allPrompts = [...urgencyPrompts, ...statusPrompts, ...typePrompts];
    }

    // Use current time to add randomness and ensure different prompts each time
    const randomIndex = (Math.floor(Math.random() * allPrompts.length * 100) + currentTime) % allPrompts.length;
    const selectedPrompt = allPrompts[randomIndex];

    // Add variation instructions for uniqueness, with urgency-aware instructions
    const urgencyInstructions = {
        'overdue': '(Be urgent, direct, and action-focused in under 80 words.)',
        'urgent': '(Be focused and time-aware in under 80 words.)',
        'soon': '(Be motivating and pace-conscious in under 80 words.)',
        'normal': '(Be thoughtful and encouraging in under 80 words.)'
    };

    const instruction = urgencyInstructions[urgencyLevel] || '(Be concise, creative and original in under 80 words.)';

    return `${selectedPrompt} ${instruction}`;
}
