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
        maxWickets: initialState.maxWickets || 11,
        striker: null,
        nonStriker: null,
        bowler: null,
        battingTeam: initialState.teamA || { name: 'PVCC', players: [] },
        bowlingTeam: initialState.teamB || { name: 'Opponent', players: [] },
        officials: {
            scorer: initialState.scorerName || '',
            umpires: initialState.umpires || ''
        },
        scorecard: {
            batting: {},
            bowling: {}
        },
        history: [],
        ballsLog: [],
        isPaused: true, // For selection prompts
        pauseReason: 'INIT', // INIT, WICKET, OVER
        ...initialState
    });

    const setStriker = (name) => setMatchState(prev => ({ ...prev, striker: name, isPaused: !prev.nonStriker || !prev.bowler }));
    const setNonStriker = (name) => setMatchState(prev => ({ ...prev, nonStriker: name, isPaused: !prev.striker || !prev.bowler }));
    const setBowler = (name) => setMatchState(prev => ({ ...prev, bowler: name, isPaused: !prev.striker || !prev.nonStriker, ballsLog: [] }));

    const overs = useMemo(() => {
        const fullOvers = Math.floor(matchState.balls / 6);
        const remainingBalls = matchState.balls % 6;
        return `${fullOvers}.${remainingBalls}`;
    }, [matchState.balls]);

    const addBall = useCallback((ballData) => {
        setMatchState(prev => {
            if (prev.isPaused) return prev;

            const fullOvers = Math.floor(prev.balls / 6);
            if (fullOvers >= prev.maxOvers || prev.wickets >= prev.maxWickets) return prev;

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

                if (newState.wickets < newState.maxWickets) {
                    newState.isPaused = true;
                    newState.pauseReason = 'WICKET';
                    newState.striker = null;
                }
            }

            const bOvers = Math.floor(currentBowler.balls / 6);
            const bBalls = currentBowler.balls % 6;
            currentBowler.overs = `${bOvers}.${bBalls}`;

            const isLegalBall = !isExtra || (extraType !== 'wide' && extraType !== 'noBall');
            const isEndOfOver = isLegalBall && newState.balls % 6 === 0;

            if (isEndOfOver && !newState.isPaused) {
                newState.isPaused = true;
                newState.pauseReason = 'OVER';
                newState.bowler = null;
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
        undo,
        setStriker,
        setNonStriker,
        setBowler
    };
};
