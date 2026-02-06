import { useState, useCallback, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const useScorer = (initialState = {}) => {
    const [matchState, setMatchState] = useState(() => {
        const { history: _h, ...cleanInitial } = initialState;
        return {
            totalRuns: 0,
            wickets: 0,
            balls: 0,
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
            maxOvers: initialState.maxOvers || 20,
            maxWickets: initialState.maxWickets || 11,
            striker: null,
            nonStriker: null,
            bowler: null,
            battingTeam: initialState.teamA || { name: 'PVCC', players: [] },
            bowlingTeam: initialState.teamB || { name: 'Opponent', players: [] },
            officials: {
                scorer: initialState.scorerName || '',
                umpires: initialState.umpires || { umpire1: '', umpire2: '' }
            },
            scorecard: { batting: {}, bowling: {} },
            history: [],
            completedInnings: [], // Preserve multi-innings history
            ballsLog: [],
            isPaused: true,
            pauseReason: 'INIT',
            lastBowler: null,
            overRuns: 0,
            innings: 1, // Current innings tracking
            ...cleanInitial,
            matchId: initialState.matchId || null
        };
    });

    const [lastSynced, setLastSynced] = useState(null);

    useEffect(() => {
        if (!matchState.matchId) return;

        const syncData = async () => {
            try {
                const { history: _h, ...stateToSync } = matchState;
                await setDoc(doc(db, 'matches', matchState.matchId), {
                    state: stateToSync,
                    lastUpdated: new Date().toISOString()
                }, { merge: true });
                setLastSynced(new Date());
            } catch (error) {
                console.error("Error syncing to Firestore:", error);
            }
        };

        const timeoutId = setTimeout(syncData, 500); // Small debounce to prevent rapid-fire syncs
        return () => clearTimeout(timeoutId);
    }, [matchState]);

    const deepCloneScorecard = (scorecard) => {
        const newScorecard = { batting: {}, bowling: {} };
        if (scorecard.batting) {
            for (const [name, stats] of Object.entries(scorecard.batting)) {
                newScorecard.batting[name] = { ...stats };
            }
        }
        if (scorecard.bowling) {
            for (const [name, stats] of Object.entries(scorecard.bowling)) {
                newScorecard.bowling[name] = { ...stats };
            }
        }
        return newScorecard;
    };

    const setStriker = useCallback((name) => {
        setMatchState(prev => {
            if (name && name === prev.nonStriker) return prev;
            return {
                ...prev,
                striker: name,
                isPaused: !name || !prev.nonStriker || !prev.bowler
            };
        });
    }, []);

    const setNonStriker = useCallback((name) => {
        setMatchState(prev => {
            if (name && name === prev.striker) return prev;
            return {
                ...prev,
                nonStriker: name,
                isPaused: !prev.striker || !name || !prev.bowler
            };
        });
    }, []);

    const setBatters = useCallback((str, nonStr) => {
        setMatchState(prev => {
            const isPaused = !str || !nonStr || !prev.bowler;
            let pauseReason = prev.pauseReason;

            // Transition from WICKET to OVER if it's the end of an over and we have batters
            if (prev.pauseReason === 'WICKET' && str && nonStr && !prev.bowler && prev.balls > 0 && prev.balls % 6 === 0) {
                pauseReason = 'OVER';
            }

            return {
                ...prev,
                striker: str,
                nonStriker: nonStr,
                isPaused,
                pauseReason
            };
        });
    }, []);

    const setBowler = useCallback((name) => {
        setMatchState(prev => ({
            ...prev,
            bowler: name,
            isPaused: !prev.striker || !prev.nonStriker || !name,
            ballsLog: [],
            overRuns: 0
        }));
    }, []);

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

            // Create a small snapshot EXCLUDING history
            const snapshot = {
                totalRuns: prev.totalRuns,
                wickets: prev.wickets,
                balls: prev.balls,
                extras: { ...prev.extras },
                striker: prev.striker,
                nonStriker: prev.nonStriker,
                bowler: prev.bowler,
                scorecard: deepCloneScorecard(prev.scorecard),
                ballsLog: [...prev.ballsLog],
                overRuns: prev.overRuns,
                isPaused: prev.isPaused,
                pauseReason: prev.pauseReason,
                lastBowler: prev.lastBowler
            };

            const newState = {
                ...prev,
                history: [...prev.history, snapshot],
                scorecard: deepCloneScorecard(prev.scorecard),
                extras: { ...prev.extras }
            };

            const { runs, isExtra, extraType, isWicket, wicketType, fielder, isStrikerOut = true } = ballData;

            // Initialize player stats if not exists
            if (!newState.scorecard.batting[prev.striker]) {
                newState.scorecard.batting[prev.striker] = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: '' };
            }
            if (!newState.scorecard.bowling[prev.bowler]) {
                newState.scorecard.bowling[prev.bowler] = { overs: '0.0', runs: 0, wickets: 0, balls: 0, maidens: 0, dots: 0 };
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
                    newState.overRuns += runs + 1;
                    newState.ballsLog = [...prev.ballsLog, `${runs}NB`];
                } else if (extraType === 'wide') {
                    currentBowler.runs += runs + 1;
                    newState.overRuns += runs + 1;
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
                newState.overRuns += runs;
                if (runs === 0) currentBowler.dots += 1;
                newState.ballsLog = [...prev.ballsLog, runs === 0 ? '•' : runs];
            }

            // 2. Handle Wickets
            if (isWicket) {
                newState.wickets += 1;

                // Credit bowler only for certain types
                const countsForBowler = ['Bowled', 'Caught', 'LBW', 'Stumped'].includes(wicketType);
                if (countsForBowler) {
                    currentBowler.wickets += 1;
                }

                const outPlayerName = isStrikerOut ? prev.striker : prev.nonStriker;
                if (!newState.scorecard.batting[outPlayerName]) {
                    newState.scorecard.batting[outPlayerName] = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: '' };
                }
                const outBatterStats = newState.scorecard.batting[outPlayerName];

                let dismissalText = '';
                if (wicketType === 'Bowled') dismissalText = `b ${prev.bowler}`;
                else if (wicketType === 'Caught') {
                    if (fielder === prev.bowler) dismissalText = `c & b ${prev.bowler}`;
                    else dismissalText = `c ${fielder || 'Fielder'} b ${prev.bowler}`;
                }
                else if (wicketType === 'LBW') dismissalText = `lbw b ${prev.bowler}`;
                else if (wicketType === 'Run Out') dismissalText = `run out (${fielder || 'Fielder'})`;
                else if (wicketType === 'Stumped') dismissalText = `st ${fielder || 'Keeper'} b ${prev.bowler}`;
                else if (wicketType === 'Retired') dismissalText = `retired out`;
                else dismissalText = wicketType;

                outBatterStats.dismissal = dismissalText;
                newState.ballsLog = [...newState.ballsLog.slice(0, -1), 'W'];

                if (newState.wickets < newState.maxWickets) {
                    newState.isPaused = true;
                    newState.pauseReason = 'WICKET';
                    if (isStrikerOut) newState.striker = null;
                    else newState.nonStriker = null;
                }
            }

            const bOvers = Math.floor(currentBowler.balls / 6);
            const bBalls = currentBowler.balls % 6;
            currentBowler.overs = `${bOvers}.${bBalls}`;
            currentBowler.economy = currentBowler.balls > 0
                ? ((currentBowler.runs / currentBowler.balls) * 6).toFixed(2)
                : '0.00';

            const isLegalBall = !isExtra || (extraType !== 'wide' && extraType !== 'noBall');
            const isEndOfOver = isLegalBall && newState.balls % 6 === 0;

            if (isEndOfOver) {
                if (newState.overRuns === 0) currentBowler.maidens += 1;
                // If a wicket fell on the last ball, stay on WICKET pause reason
                // The ScorerBoard will handle the double-pause flow
                if (newState.pauseReason !== 'WICKET') {
                    newState.isPaused = true;
                    newState.pauseReason = 'OVER';
                }
                newState.lastBowler = prev.bowler;
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
            if (!prev.history || prev.history.length === 0) return prev;
            const previousState = prev.history[prev.history.length - 1];
            return {
                ...prev,
                ...previousState,
                history: prev.history.slice(0, -1)
            };
        });
    }, []);

    const swapStriker = useCallback(() => {
        setMatchState(prev => ({
            ...prev,
            striker: prev.nonStriker,
            nonStriker: prev.striker
        }));
    }, []);

    const startNextInnings = useCallback(() => {
        setMatchState(prev => ({
            ...prev,
            completedInnings: [
                ...(prev.completedInnings || []),
                {
                    inningsNum: prev.innings || 1,
                    battingTeam: prev.battingTeam.name,
                    bowlingTeam: prev.bowlingTeam.name,
                    totalRuns: prev.totalRuns,
                    wickets: prev.wickets,
                    balls: prev.balls,
                    extras: { ...prev.extras },
                    scorecard: deepCloneScorecard(prev.scorecard)
                }
            ],
            battingTeam: prev.bowlingTeam,
            bowlingTeam: prev.battingTeam,
            totalRuns: 0,
            wickets: 0,
            balls: 0,
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
            scorecard: { batting: {}, bowling: {} },
            history: [],
            ballsLog: [],
            isPaused: true,
            pauseReason: 'INIT',
            lastBowler: null,
            overRuns: 0,
            striker: null,
            nonStriker: null,
            bowler: null,
            innings: (prev.innings || 1) + 1
        }));
    }, [deepCloneScorecard]);

    const maxOversPerBowler = useMemo(() => {
        return Math.ceil(matchState.maxOvers / 5);
    }, [matchState.maxOvers]);

    return {
        matchState,
        overs,
        addBall,
        undo,
        lastSynced,
        swapStriker,
        startNextInnings,
        maxOversPerBowler,
        setStriker,
        setNonStriker,
        setBatters,
        setBowler
    };
};
