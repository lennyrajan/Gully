import { useState, useCallback, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { createMatchPost } from '@/lib/banterbot';

export const useScorer = (initialState = {}) => {
    const [matchState, setMatchState] = useState(() => {
        const { history: _h, ...cleanInitial } = initialState;
        return {
            totalRuns: 0,
            wickets: 0,
            balls: 0,
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, wideRuns: 0, noBallRuns: 0, penalties: 0 },
            maxOvers: initialState.maxOvers || 20,
            maxWickets: initialState.maxWickets || 11,
            striker: null,
            nonStriker: null,
            bowler: null,
            isFreeHit: false, // ICC Law 21: Free hit after no-ball
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
            commentary: [], // Ball-by-ball commentary
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

    // Helper: Publish match event for live feeds
    const publishMatchEvent = useCallback(async (eventData) => {
        if (!matchState.matchId) return;

        try {
            await addDoc(collection(db, 'matches', matchState.matchId, 'events'), {
                ...eventData,
                timestamp: new Date().toISOString(),
                inningsNum: matchState.innings,
                battingTeam: matchState.battingTeam.name,
                bowlingTeam: matchState.bowlingTeam.name
            });
        } catch (error) {
            console.error('Error publishing match event:', error);
        }
    }, [matchState.matchId, matchState.innings, matchState.battingTeam.name, matchState.bowlingTeam.name]);

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
            } else if (!isPaused) {
                pauseReason = null;
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
        setMatchState(prev => {
            const isPaused = !prev.striker || !prev.nonStriker || !name;
            return {
                ...prev,
                bowler: name,
                isPaused,
                pauseReason: isPaused ? prev.pauseReason : null,
                ballsLog: [],
                overRuns: 0
            };
        });
    }, []);

    const overs = useMemo(() => {
        const fullOvers = Math.floor(matchState.balls / 6);
        const remainingBalls = matchState.balls % 6;
        return `${fullOvers}.${remainingBalls}`;
    }, [matchState.balls]);

    const addBall = useCallback((ballData) => {
        setMatchState(prev => {
            // Strict guard: No scoring if paused or missing key players
            if (prev.isPaused || !prev.bowler || !prev.striker || !prev.nonStriker) return prev;

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

            // 1. Handle Runs & Extras (ICC Laws 18, 21, 22, 23)
            let ballIsLegal = true; // Track if ball counts toward over

            if (isExtra) {
                if (extraType === 'noBall') {
                    // ICC Law 21: No-ball
                    ballIsLegal = false; // No-ball doesn't count toward over
                    newState.extras.noBalls += 1;
                    newState.extras.noBallRuns += runs; // Track runs off no-ball separately
                    newState.totalRuns += runs + 1; // Batsman runs + 1 penalty

                    currentBatter.balls += 1; // Batsman faces the ball
                    currentBatter.runs += runs; // Batsman gets credit for runs
                    if (runs === 4) currentBatter.fours += 1;
                    if (runs === 6) currentBatter.sixes += 1;

                    currentBowler.runs += runs + 1; // Bowler concedes runs + penalty
                    newState.overRuns += runs + 1;
                    newState.ballsLog = [...prev.ballsLog, runs > 0 ? `${runs}NB` : 'NB'];

                    // ICC Law 21.4: Next ball is a Free Hit (T20/ODI)
                    newState.isFreeHit = true;

                } else if (extraType === 'wide') {
                    // ICC Law 22: Wide ball
                    ballIsLegal = false; // Wide doesn't count toward over
                    newState.extras.wides += 1;
                    newState.extras.wideRuns += runs; // Track runs off wide separately
                    newState.totalRuns += runs + 1; // Runs scored + 1 penalty

                    // Batsman does NOT face the ball on a wide
                    // But can score runs if they run
                    currentBowler.runs += runs + 1; // Bowler concedes all
                    newState.overRuns += runs + 1;
                    newState.ballsLog = [...prev.ballsLog, runs > 0 ? `${runs}Wd` : 'Wd'];

                } else if (extraType === 'bye' || extraType === 'legBye') {
                    // ICC Law 23: Byes and Leg Byes
                    ballIsLegal = true; // Legal delivery
                    newState.balls += 1;
                    newState.extras[extraType === 'bye' ? 'byes' : 'legByes'] += runs;
                    newState.totalRuns += runs;

                    currentBatter.balls += 1; // Batsman faces the ball
                    // Batsman does NOT get runs credited
                    currentBowler.balls += 1;
                    // Bowler does NOT concede runs (extras don't count against bowler)
                    newState.ballsLog = [...prev.ballsLog, extraType === 'bye' ? `${runs}B` : `${runs}LB`];

                    // Clear free hit after legal delivery
                    if (prev.isFreeHit) newState.isFreeHit = false;
                }
            } else {
                // Normal delivery
                ballIsLegal = true;
                newState.balls += 1;
                newState.totalRuns += runs;

                currentBatter.runs += runs;
                currentBatter.balls += 1;
                if (runs === 4) currentBatter.fours += 1;
                if (runs === 6) currentBatter.sixes += 1;

                currentBowler.runs += runs;
                currentBowler.balls += 1;
                newState.overRuns += runs;
                if (runs === 0) currentBowler.dots += 1;
                newState.ballsLog = [...prev.ballsLog, runs === 0 ? '•' : runs];

                // Clear free hit after legal delivery
                if (prev.isFreeHit) newState.isFreeHit = false;
            }

            // 2. Handle Wickets (ICC Laws 21.4, 27-32)
            if (isWicket) {
                // ICC Law 21.4: On a Free Hit, batsman can only be run out
                const isFreeHitDismissal = prev.isFreeHit && wicketType !== 'Run Out';

                if (isFreeHitDismissal) {
                    // Wicket is NOT valid on free hit (except run out)
                    // Ball has already been processed, just skip wicket logic
                    console.log('Wicket ignored - Free Hit delivery (only run out allowed)');
                } else {
                    // Valid wicket
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

                    // Only pause for new batter if we haven't reached max wickets
                    // If we've reached 10 wickets, innings is over - no need to select new batter
                    if (newState.wickets < newState.maxWickets) {
                        newState.isPaused = true;
                        newState.pauseReason = 'WICKET';
                        if (isStrikerOut) newState.striker = null;
                        else newState.nonStriker = null;
                    }
                    // If wickets === maxWickets, innings is over, don't pause for batter
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

                newState.isPaused = true;
                // If a wicket fell, we prioritize the WICKET pause reason initially
                // The ScorerBoard will handle the transition to OVER after batter selection
                if (newState.pauseReason !== 'WICKET') {
                    newState.pauseReason = 'OVER';
                }
                newState.lastBowler = prev.bowler;
                newState.bowler = null;
            }

            // Generate Ball-by-Ball Commentary
            const generateCommentary = () => {
                // Calculate ball number for display (legal balls only for over number)
                const legalBalls = ballIsLegal ? newState.balls : prev.balls;
                const overNum = Math.floor(legalBalls / 6);
                const ballNum = (legalBalls % 6) + (ballIsLegal ? 0 : 1); // If illegal, use previous ball number
                const ballNotation = `${overNum}.${ballNum}`;

                if (isWicket && !isFreeHitDismissal) {
                    const dismissedPlayer = isStrikerOut ? prev.striker : prev.nonStriker;
                    return `${ballNotation}: WICKET! ${dismissedPlayer} ${wicketType}`;
                }

                if (isExtra) {
                    if (extraType === 'wide') {
                        return `${ballNotation}: ${prev.bowler} bowls a wide${runs > 0 ? `, ${runs} run${runs > 1 ? 's' : ''}` : ''}`;
                    } else if (extraType === 'noBall') {
                        return `${ballNotation}: ${prev.bowler} bowls a no-ball${runs > 0 ? `, ${prev.striker} scores ${runs}` : ''}`;
                    } else if (extraType === 'bye') {
                        return `${ballNotation}: ${runs} bye${runs > 1 ? 's' : ''}`;
                    } else if (extraType === 'legBye') {
                        return `${ballNotation}: ${runs} leg bye${runs > 1 ? 's' : ''}`;
                    }
                }

                if (runs === 0) {
                    return `${ballNotation}: ${prev.striker} defends`;
                } else if (runs === 4) {
                    return `${ballNotation}: ${prev.striker} hits FOUR!`;
                } else if (runs === 6) {
                    return `${ballNotation}: ${prev.striker} hits SIX!`;
                } else if (runs === 1) {
                    return `${ballNotation}: ${prev.striker} takes a single`;
                } else {
                    return `${ballNotation}: ${prev.striker} takes ${runs} runs`;
                }
            };

            newState.commentary = [...prev.commentary, generateCommentary()];

            // 3. Striker Rotation (ICC Law 18.3)
            // Batsmen cross if odd runs are scored OR at end of over
            // IMPORTANT: Rotation happens even if there's a wicket with odd runs
            const shouldRotate = (runs % 2 !== 0) || (isEndOfOver && !isWicket);

            if (shouldRotate && newState.striker && newState.nonStriker) {
                const temp = newState.striker;
                newState.striker = newState.nonStriker;
                newState.nonStriker = temp;
            }

            // 4. Check for Innings Completion
            const totalOvers = Math.floor(newState.balls / 6);
            const maxOvers = prev.maxOvers || 20;
            const isOversComplete = totalOvers >= maxOvers;
            const isAllOut = newState.wickets >= 10;

            // Check if target is chased (2nd innings)
            const isSecondInnings = prev.innings === 2;
            const targetScore = isSecondInnings && prev.completedInnings?.[0]?.totalRuns ? prev.completedInnings[0].totalRuns + 1 : null;
            const isTargetChased = isSecondInnings && targetScore && newState.totalRuns >= targetScore;

            // Innings is complete if: overs done, all out, or target chased
            if ((isOversComplete || isAllOut || isTargetChased) && !newState.isInningsComplete) {
                newState.isInningsComplete = true;
                newState.isPaused = true;
                newState.pauseReason = 'INNINGS_COMPLETE';
                newState.bowler = null;
            }

            // 4. Publish Match Event for Live Feeds
            // Use setTimeout to ensure state update completes first
            setTimeout(() => {
                const { runs, isExtra, extraType, isWicket, wicketType } = ballData;
                const overNum = `${Math.floor(newState.balls / 6)}.${newState.balls % 6}`;

                // Determine event type and summary
                let eventType = 'BALL';
                let summary = '';
                let icon = 'DOT';

                if (isWicket && !isFreeHitDismissal) {
                    eventType = 'WICKET';
                    icon = 'WICKET';
                    const dismissedPlayer = isStrikerOut ? prev.striker : prev.nonStriker;
                    summary = `WICKET! ${dismissedPlayer} ${wicketType}`;
                } else if (runs === 6) {
                    eventType = 'BOUNDARY';
                    icon = 'SIX';
                    summary = `${prev.striker} hits SIX!`;
                } else if (runs === 4) {
                    eventType = 'BOUNDARY';
                    icon = 'FOUR';
                    summary = `${prev.striker} hits FOUR!`;
                } else if (isExtra) {
                    if (extraType === 'wide') {
                        summary = `Wide ball${runs > 0 ? ` + ${runs} runs` : ''}`;
                        icon = 'WIDE';
                    } else if (extraType === 'noBall') {
                        summary = `No ball${runs > 0 ? `, ${prev.striker} scores ${runs}` : ''}`;
                        icon = 'NOBALL';
                    } else {
                        summary = `${runs} ${extraType === 'bye' ? 'Byes' : 'Leg Byes'}`;
                    }
                } else if (runs === 0) {
                    summary = `Dot ball`;
                    icon = 'DOT';
                } else {
                    summary = `${prev.striker} scores ${runs}`;
                    icon = runs.toString();
                }

                publishMatchEvent({
                    eventType,
                    overNum,
                    runs,
                    isWicket: isWicket && !isFreeHitDismissal,
                    isBoundary: runs === 4 || runs === 6,
                    extras: isExtra ? { type: extraType, runs } : null,
                    summary,
                    icon,
                    striker: prev.striker,
                    bowler: prev.bowler,
                    score: `${newState.totalRuns}/${newState.wickets}`
                });

                // BanterBot Auto-Posting
                if (prev.matchId) {
                    console.log('🤖 BanterBot: Checking for events to post...', { matchId: prev.matchId });
                    const oldBattingStats = prev.scorecard.batting[prev.striker] || { runs: 0, balls: 0 };
                    const newBattingStats = newState.scorecard.batting[prev.striker] || { runs: 0, balls: 0 };
                    const oldBowlingStats = prev.scorecard.bowling[prev.bowler] || { wickets: 0 };
                    const newBowlingStats = newState.scorecard.bowling[prev.bowler] || { wickets: 0 };

                    // Wicket
                    if (isWicket && !isFreeHitDismissal) {
                        console.log('🤖 BanterBot: Posting WICKET');
                        const dismissedPlayer = isStrikerOut ? prev.striker : prev.nonStriker;
                        const dismissedStats = newState.scorecard.batting[dismissedPlayer] || { runs: 0, balls: 0 };
                        createMatchPost('WICKET', {
                            batsman: dismissedPlayer,
                            bowler: prev.bowler,
                            runs: dismissedStats.runs,
                            balls: dismissedStats.balls,
                            dismissalType: wicketType,
                            fielder: fielder,
                            teamName: prev.battingTeam.name,
                            score: newState.totalRuns,
                            wickets: newState.wickets
                        }, prev.matchId).catch(err => console.error('BanterBot wicket error:', err));
                    }

                    // Boundaries
                    if (runs === 4 && !isExtra) {
                        console.log('🤖 BanterBot: Posting FOUR');
                        createMatchPost('FOUR', {
                            batsman: prev.striker,
                            teamName: prev.battingTeam.name,
                            score: newState.totalRuns,
                            wickets: newState.wickets
                        }, prev.matchId).catch(err => console.error('BanterBot four error:', err));
                    }

                    if (runs === 6 && !isExtra) {
                        console.log('🤖 BanterBot: Posting SIX');
                        createMatchPost('SIX', {
                            batsman: prev.striker,
                            teamName: prev.battingTeam.name,
                            score: newState.totalRuns,
                            wickets: newState.wickets
                        }, prev.matchId).catch(err => console.error('BanterBot six error:', err));
                    }

                    // Batting Milestones
                    if (newBattingStats.runs >= 30 && oldBattingStats.runs < 30) {
                        console.log('🤖 BanterBot: Posting THIRTY milestone');
                        createMatchPost('THIRTY', {
                            batsman: prev.striker,
                            runs: newBattingStats.runs,
                            balls: newBattingStats.balls
                        }, prev.matchId).catch(err => console.error('BanterBot thirty error:', err));
                    }

                    if (newBattingStats.runs >= 50 && oldBattingStats.runs < 50) {
                        console.log('🤖 BanterBot: Posting FIFTY milestone');
                        createMatchPost('FIFTY', {
                            batsman: prev.striker,
                            runs: newBattingStats.runs,
                            balls: newBattingStats.balls
                        }, prev.matchId).catch(err => console.error('BanterBot fifty error:', err));
                    }

                    if (newBattingStats.runs >= 100 && oldBattingStats.runs < 100) {
                        console.log('🤖 BanterBot: Posting CENTURY milestone');
                        createMatchPost('CENTURY', {
                            batsman: prev.striker,
                            runs: newBattingStats.runs,
                            balls: newBattingStats.balls
                        }, prev.matchId).catch(err => console.error('BanterBot century error:', err));
                    }

                    // Bowling Milestones
                    if (newBowlingStats.wickets >= 3 && oldBowlingStats.wickets < 3) {
                        console.log('🤖 BanterBot: Posting THREE_WICKETS milestone');
                        createMatchPost('THREE_WICKETS', {
                            bowler: prev.bowler,
                            wickets: newBowlingStats.wickets,
                            runs: newBowlingStats.runs,
                            overs: newBowlingStats.overs
                        }, prev.matchId).catch(err => console.error('BanterBot 3 wickets error:', err));
                    }

                    if (newBowlingStats.wickets >= 5 && oldBowlingStats.wickets < 5) {
                        console.log('🤖 BanterBot: Posting FIVE_WICKETS milestone');
                        createMatchPost('FIVE_WICKETS', {
                            bowler: prev.bowler,
                            wickets: newBowlingStats.wickets,
                            runs: newBowlingStats.runs,
                            overs: newBowlingStats.overs
                        }, prev.matchId).catch(err => console.error('BanterBot 5 wickets error:', err));
                    }

                    // Hat-trick (3 wickets in 3 consecutive balls)
                    const lastThreeBalls = newState.ballsLog.slice(-3);
                    if (lastThreeBalls.length === 3 && lastThreeBalls.every(ball => ball === 'W')) {
                        console.log('🤖 BanterBot: Posting HAT_TRICK!');
                        createMatchPost('HAT_TRICK', {
                            bowler: prev.bowler
                        }, prev.matchId).catch(err => console.error('BanterBot hat-trick error:', err));
                    }

                    // Maiden Over (completed over with 0 runs)
                    if (isEndOfOver && prev.overRuns === 0) {
                        console.log('🤖 BanterBot: Posting MAIDEN_OVER');
                        createMatchPost('MAIDEN_OVER', {
                            bowler: prev.bowler
                        }, prev.matchId).catch(err => console.error('BanterBot maiden error:', err));
                    }

                    // End of Over
                    if (isEndOfOver) {
                        console.log('🤖 BanterBot: Posting END_OF_OVER');
                        createMatchPost('END_OF_OVER', {
                            teamName: prev.battingTeam.name,
                            score: newState.totalRuns,
                            wickets: newState.wickets,
                            overs: Math.floor(newState.balls / 6)
                        }, prev.matchId).catch(err => console.error('BanterBot end of over error:', err));
                    }

                    // Innings Complete
                    if (newState.isInningsComplete && !prev.isInningsComplete) {
                        console.log('🤖 BanterBot: Posting INNINGS_COMPLETE');
                        createMatchPost('INNINGS_COMPLETE', {
                            teamName: prev.battingTeam.name,
                            score: newState.totalRuns,
                            wickets: newState.wickets,
                            overs: `${Math.floor(newState.balls / 6)}.${newState.balls % 6}`
                        }, prev.matchId).catch(err => console.error('BanterBot innings complete error:', err));
                    }
                }
            }, 100);

            return newState;
        });
    }, [publishMatchEvent]);

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
