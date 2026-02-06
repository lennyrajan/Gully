"use client";

import { useState, useCallback, useMemo } from 'react';

export const useScorer = (initialState = {}) => {
    const [matchState, setMatchState] = useState({
        totalRuns: 0,
        wickets: 0,
        balls: 0,
        extras: {
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0
        },
        striker: 'Player 1',
        nonStriker: 'Player 2',
        history: [], // For undo functionality
        ...initialState
    });

    const overs = useMemo(() => {
        const fullOvers = Math.floor(matchState.balls / 6);
        const remainingBalls = matchState.balls % 6;
        return `${fullOvers}.${remainingBalls}`;
    }, [matchState.balls]);

    const addBall = useCallback((ballData) => {
        setMatchState(prev => {
            const newState = { ...prev, history: [...prev.history, { ...prev }] };
            const { runs, isExtra, extraType, isWicket, wicketType } = ballData;

            // 1. Handle Runs & Extras
            if (isExtra) {
                newState.totalRuns += runs + (extraType === 'wide' || extraType === 'noBall' ? 1 : 0);
                newState.extras[extraType + 's'] += 1;

                // Wides and No-balls don't count as a legal ball
                if (extraType !== 'wide' && extraType !== 'noBall') {
                    newState.balls += 1;
                }
            } else {
                newState.totalRuns += runs;
                newState.balls += 1;
            }

            // 2. Handle Wickets
            if (isWicket) {
                newState.wickets += 1;
                // Logic for replacing striker would go here
            }

            // 3. Strike Rotation (for odd runs and end of over)
            const isLegalBall = !isExtra || (extraType !== 'wide' && extraType !== 'noBall');
            const isEndOfOver = isLegalBall && newState.balls % 6 === 0;

            if ((runs % 2 !== 0 && !isWicket) || isEndOfOver) {
                const temp = newState.striker;
                newState.striker = newState.nonStriker;
                newState.nonStriker = temp;
            }

            return newState;
        });
    }, []);

    const undo = useCallback(() => {
        setMatchState(prev => {
            if (prev.history.length === 0) return prev;
            return prev.history[prev.history.length - 1];
        });
    }, []);

    return {
        matchState,
        overs,
        addBall,
        undo
    };
};
