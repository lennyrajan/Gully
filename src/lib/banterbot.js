import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * BanterBot - Automatically posts match events to the Fun Corner
 * Creates engaging posts for wickets, boundaries, milestones, and more
 */

export const createMatchPost = async (eventType, eventData, matchId) => {
    try {
        const post = {
            content: generatePostContent(eventType, eventData),
            userName: '🤖 GullyBot',
            type: 'bot',
            author: {
                uid: 'banterbot',
                displayName: '🤖 GullyBot',
                photoURL: null
            },
            matchId: matchId,
            eventType: eventType,
            createdAt: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: []
        };

        await addDoc(collection(db, 'posts'), post);
    } catch (error) {
        console.error('BanterBot error:', error);
        // Fail silently - don't interrupt scoring if posting fails
    }
};

const generatePostContent = (eventType, data) => {
    switch (eventType) {
        case 'WICKET':
            // Different messages for different dismissal types
            if (data.dismissalType === 'Run Out') {
                return `🏏 WICKET! ${data.batsman} run out for ${data.runs} (${data.balls})${data.fielder ? ` - ${data.fielder} with the direct hit!` : '!'}`;
            } else if (data.dismissalType === 'Stumped') {
                return `🏏 WICKET! ${data.batsman} stumped for ${data.runs} (${data.balls})${data.fielder ? ` by ${data.fielder}` : ''} - ${data.bowler} gets the wicket!`;
            } else {
                // Bowled, Caught, LBW - bowler gets full credit
                return `🏏 WICKET! ${data.batsman} dismissed for ${data.runs} (${data.balls}) - ${data.bowler} strikes! ${data.dismissalType}`;
            }

        case 'FOUR':
            return `💥 FOUR! ${data.batsman} finds the boundary! ${data.teamName} ${data.score}/${data.wickets}`;

        case 'SIX':
            return `🚀 SIX! ${data.batsman} sends it sailing! ${data.teamName} ${data.score}/${data.wickets}`;

        case 'THIRTY':
            return `⚡ ${data.batsman} races to 30! ${data.runs} off ${data.balls} balls`;

        case 'FIFTY':
            return `👏 FIFTY for ${data.batsman}! Brilliant knock of ${data.runs} off ${data.balls} balls`;

        case 'CENTURY':
            return `💯 CENTURY! ${data.batsman} reaches 100 runs! What an innings!`;

        case 'THREE_WICKETS':
            return `🔥 3 wickets for ${data.bowler}! ${data.wickets}/${data.runs} in ${data.overs} overs`;

        case 'FIVE_WICKETS':
            return `🎯 5-wicket haul for ${data.bowler}! ${data.wickets}/${data.runs} in ${data.overs} overs`;

        case 'HAT_TRICK':
            return `🎩 HAT-TRICK! ${data.bowler} takes 3 in 3! Incredible bowling!`;

        case 'MAIDEN_OVER':
            return `⭕ Maiden over by ${data.bowler}! Tight bowling`;

        case 'END_OF_OVER':
            return `${data.teamName} ${data.score}/${data.wickets} after ${data.overs} overs`;

        case 'INNINGS_COMPLETE':
            return `${data.teamName} finishes on ${data.score}/${data.wickets} in ${data.overs} overs`;

        case 'MATCH_START':
            return `🏏 Match started: ${data.teamA} vs ${data.teamB}`;

        case 'TOSS':
            return `🪙 ${data.winner} won the toss and elected to ${data.decision}`;

        default:
            return `Match update: ${data.summary || 'Event occurred'}`;
    }
};
