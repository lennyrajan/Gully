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
        maxOvers: initialState.maxOvers || 20,
        striker: initialState.teamA?.players[0] || 'Batter 1',
        nonStriker: initialState.teamA?.players[1] || 'Batter 2',
        bowler: 'Bowler 1',
        battingTeam: initialState.teamA || { name: 'PVCC', players: [] },
        bowlingTeam: initialState.teamB || { name: 'Opponent', players: [] },
        scorecard: {
            batting: {}, // { playerName: { runs: 0, balls: 0, 4s: 0, 6s: 0, dismissal: '' } }
            bowling: {}  // { playerName: { overs: 0, runs: 0, wickets: 0 } }
        },
        history: [], // For undo functionality
        ballsLog: [], // For feedback (e.g., [0, 1, 'W', 4, 0, 6])
        ...initialState
    });

    const overs = useMemo(() => {
        const fullOvers = Math.floor(matchState.balls / 6);
        const remainingBalls = matchState.balls % 6;
        return `${fullOvers}.${remainingBalls}`;
    }, [matchState.balls]);

    const addBall = useCallback((ballData) => {
        setMatchState(prev => {
            // Check if innings already ended
            const fullOvers = Math.floor(prev.balls / 6);
            if (fullOvers >= prev.maxOvers) return prev;

            const newState = {
                ...prev,
                history: [...prev.history, JSON.parse(JSON.stringify(prev))],
                scorecard: JSON.parse(JSON.stringify(prev.scorecard))
            };

            const { runs, isExtra, extraType, isWicket, wicketType, fielder } = ballData;

            // Initialize player stats if not exists
            if (!newState.scorecard.batting[prev.striker]) {
                newState.scorecard.batting[prev.striker] = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: '' };
            }
            if (!newState.scorecard.bowling[prev.bowler]) {
                newState.scorecard.bowling[prev.bowler] = { overs: '0.0', runs: 0, wickets: 0, balls: 0 };
            }

            const currentBatter = newState.scorecard.batting[prev.striker];
            const currentBowler = newState.scorecard.bowling[prev.bowler];

            // 1. Handle Runs & Extras
            if (isExtra) {
                const extraRuns = (extraType === 'wide' || extraType === 'noBall' ? 1 : 0);
                newState.totalRuns += runs + extraRuns;
                newState.extras[extraType + 's'] += 1;

                if (extraType === 'noBall') {
                    currentBatter.balls += 1;
                    currentBatter.runs += runs;
                    currentBowler.runs += runs + 1;
                    newState.ballsLog = [...prev.ballsLog, `${runs}NB`];
                } else if (extraType === 'wide') {
                    currentBowler.runs += runs + 1;
                    newState.ballsLog = [...prev.ballsLog, `${runs}Wd`];
                } else {
                    // Byes/LegByes - batter doesn't get runs, but ball is legal
                    newState.balls += 1;
                    currentBatter.balls += 1;
                    currentBowler.balls += 1;
                    newState.ballsLog = [...prev.ballsLog, extraType === 'bye' ? 'B' : 'LB'];
                }
            } else {
                newState.totalRuns += runs;
                newState.balls += 1;
                currentBatter.runs += runs;
                currentBatter.balls += 1;
                if (runs === 4) currentBatter.fours += 1;
                if (runs === 6) currentBatter.sixes += 1;

                currentBowler.runs += runs;
                currentBowler.balls += 1;
                newState.ballsLog = [...prev.ballsLog, runs === 0 ? '•' : runs];
            }

            // 2. Handle Wickets
            if (isWicket) {
                newState.wickets += 1;
                currentBowler.wickets += 1;

                let dismissalText = '';
                if (wicketType === 'Bowled') dismissalText = `b ${prev.bowler}`;
                else if (wicketType === 'Caught') dismissalText = `c ${fielder || 'Fielder'} b ${prev.bowler}`;
                else if (wicketType === 'LBW') dismissalText = `lbw b ${prev.bowler}`;
                else if (wicketType === 'Run Out') dismissalText = `run out (${fielder || 'Fielder'})`;
                else dismissalText = wicketType;

                currentBatter.dismissal = dismissalText;
                newState.ballsLog = [...newState.ballsLog.slice(0, -1), 'W'];

                // Handle Batter replacement - would normally open a modal, 
                // but for now we'll just move to next in list if available
                const nextBatterIndex = newState.battingTeam.players.findIndex(p => p && !newState.scorecard.batting[p]);
                if (nextBatterIndex !== -1) {
                    newState.striker = newState.battingTeam.players[nextBatterIndex];
                }
            }

            // Update bowler overs display
            const bOvers = Math.floor(currentBowler.balls / 6);
            const bBalls = currentBowler.balls % 6;
            currentBowler.overs = `${bOvers}.${bBalls}`;

            // 3. Strike Rotation
            const isLegalBall = !isExtra || (extraType !== 'wide' && extraType !== 'noBall');
            const isEndOfOver = isLegalBall && newState.balls % 6 === 0;

            if (isEndOfOver) {
                newState.ballsLog = []; // Reset visual log for new over
            }

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
