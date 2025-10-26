import { useState, useEffect, useRef } from 'react'
import './App.css'
import { supabase, RankingRecord, isSupabaseConfigured } from './supabaseClient'

type GamePhase = 'waitingQueue' | 'captcha' | 'playing' | 'finished' | 'leaderboard' | 'chat'

interface Seat {
  id: string
  isActive: boolean
}

interface ConfettiParticle {
  x: number
  y: number
  size: number
  color: string
  speed: number
  offset: number
}

function App() {
  const [phase, setPhase] = useState<GamePhase>('waitingQueue')
  const [queueNumber, setQueueNumber] = useState(Math.floor(Math.random() * 6000) + 3000)
  const [round, setRound] = useState(1)
  const totalRounds = 5
  const [isRunning, setIsRunning] = useState(false)
  const [seats, setSeats] = useState<(Seat | null)[][]>([])
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [resultText, setResultText] = useState('대기중...')
  const [openSeats, setOpenSeats] = useState<string[]>([])
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set())
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaStartTime, setCaptchaStartTime] = useState<Date | null>(null)
  const [captchaTime, setCaptchaTime] = useState<number>(0)
  const [totalStartTime, setTotalStartTime] = useState<Date | null>(null)
  const [totalTime, setTotalTime] = useState<number>(0)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [roundStartTime, setRoundStartTime] = useState<number>(0)
  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem('podoal_nickname') || ''
  })
  const [showNicknameInput, setShowNicknameInput] = useState(false)
  const [isSavingRank, setIsSavingRank] = useState(false)
  
  // 채팅 관련 상태
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  
  const [bestTime, setBestTime] = useState<number>(() => {
    const saved = localStorage.getItem('bestTime')
    return saved ? parseFloat(saved) : 9999
  })
  const [avgTime, setAvgTime] = useState<number>(() => {
    const saved = localStorage.getItem('avgTime')
    return saved ? parseFloat(saved) : 9999
  })

  // ✅ Queue countdown logic
  useEffect(() => {
    if (phase !== 'waitingQueue') return
    
    const interval = setInterval(() => {
      setQueueNumber(prev => {
        let next = prev
        if (prev > 1000) {
          next = prev - Math.floor(Math.random() * 500) - 700
        } else if (prev > 100) {
          next = prev - Math.floor(Math.random() * 200) - 100
        } else if (prev > 0) {
          next = prev - Math.floor(Math.random() * 40) - 10
        } else {
          next = 0
          clearInterval(interval)
          setTimeout(() => {
            setPhase('captcha')
            generateCaptcha()
            const startTime = new Date()
            setCaptchaStartTime(startTime)
            setTotalStartTime(startTime)
          }, 200)
        }
        return Math.max(0, next)
      })
    }, 800)
    
    return () => clearInterval(interval)
  }, [phase])

  // ✅ Timer update logic
  useEffect(() => {
    if ((phase === 'captcha' || phase === 'playing') && totalStartTime) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - totalStartTime.getTime()) / 1000
        setCurrentTime(elapsed)
      }, 10) // 10ms 단위로 업데이트
      
      return () => clearInterval(interval)
    }
  }, [phase, totalStartTime])

  // 보안문자 생성
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaCode(code)
    setCaptchaInput('')
  }

  // 보안문자 검증
  const verifyCaptcha = () => {
    if (captchaInput.toUpperCase() === captchaCode) {
      if (captchaStartTime && totalStartTime) {
        const timeTaken = (Date.now() - captchaStartTime.getTime()) / 1000
        setCaptchaTime(timeTaken)
        // 게임 시작 시점의 currentTime 저장
        const gameStartTime = (Date.now() - totalStartTime.getTime()) / 1000
        setRoundStartTime(gameStartTime)
      }
      setPhase('playing')
      startGame()
    } else {
      alert('보안문자가 일치하지 않습니다. 다시 시도해주세요.')
      generateCaptcha()
      setCaptchaInput('')
      setCaptchaStartTime(new Date())
    }
  }

  const seatGrid = (round: number): [number, number] => {
    switch (round) {
      case 1: return [10, 16]
      case 2: return [12, 20]
      case 3: return [14, 24]
      case 4: return [16, 28]
      default: return [18, 32]
    }
  }

  const makeStairPattern = (rows: number, cols: number): (Seat | null)[][] => {
    const grid: (Seat | null)[][] = []
    for (let r = 0; r < rows; r++) {
      const row: (Seat | null)[] = []
      const limit = Math.min(cols, r + Math.floor(Math.random() * 3) + 3)
      for (let c = 0; c < cols; c++) {
        if (c < limit) {
          row.push({ id: `${r}-${c}-${Math.random()}`, isActive: false })
        } else {
          row.push(null)
        }
      }
      grid.push(row)
    }
    return grid
  }

  const startGame = () => {
    setIsRunning(true)
    setRound(1)
    setReactionTimes([])
    setSelectedSeats(new Set())
    nextRound(1, [])
  }

  const nextRound = (currentRound: number, prevReactionTimes: number[]) => {
    if (currentRound > totalRounds) {
      endGame(prevReactionTimes)
      return
    }
    
    setResultText(`라운드 ${currentRound} 준비 중...`)
    const [rows, cols] = seatGrid(currentRound)
    const newSeats = makeStairPattern(rows, cols)
    setSeats(newSeats)
    setSelectedSeats(new Set())
    setOpenSeats([])
    
    // 라운드 시작 시간 기록 (타이머 기준)
    if (totalStartTime) {
      const currentElapsed = (Date.now() - totalStartTime.getTime()) / 1000
      setRoundStartTime(currentElapsed)
    }
    
    setTimeout(() => {
      openRandomSeats(newSeats)
    }, 1000)
  }

  const openRandomSeats = (currentSeats: (Seat | null)[][]) => {
    const allSeats = currentSeats.flat().filter(s => s !== null) as Seat[]
    const shuffled = allSeats.sort(() => Math.random() - 0.5).slice(0, 2)
    const openIds = shuffled.map(s => s.id)
    setOpenSeats(openIds)
    
    const updatedSeats = currentSeats.map(row =>
      row.map(seat => {
        if (seat && openIds.includes(seat.id)) {
          return { ...seat, isActive: true }
        }
        return seat
      })
    )
    setSeats(updatedSeats)
    setResultText('GO! (2좌석 클릭)')
  }

  const handleTap = (seat: Seat) => {
    if (!isRunning || !openSeats.includes(seat.id)) return
    
    const newSelected = new Set(selectedSeats)
    newSelected.add(seat.id)
    setSelectedSeats(newSelected)
    
    // Mark seat as inactive
    setSeats(prev => prev.map(row =>
      row.map(s => s?.id === seat.id ? { ...s, isActive: false } : s)
    ))
    
    if (newSelected.size === 1) {
      setResultText('1/2 선택됨')
    } else if (newSelected.size === 2) {
      setResultText(`Round ${round} 완료!`)
      
      setTimeout(() => {
        // 라운드 완료 시간 계산 (전환 대기 시간 포함)
        if (totalStartTime) {
          const currentElapsed = (Date.now() - totalStartTime.getTime()) / 1000
          const roundTime = currentElapsed - roundStartTime
          const newReactionTimes = [...reactionTimes, roundTime]
          setReactionTimes(newReactionTimes)
          
          if (round < totalRounds) {
            const nextRoundNum = round + 1
            setRound(nextRoundNum)
            nextRound(nextRoundNum, newReactionTimes)
          } else {
            endGame(newReactionTimes)
          }
        }
      }, 1200)
    }
  }

  const endGame = (finalReactionTimes: number[]) => {
    setIsRunning(false)
    
    // 전체 시간 계산
    if (totalStartTime) {
      const finalTotalTime = (Date.now() - totalStartTime.getTime()) / 1000
      setTotalTime(finalTotalTime)
    }
    
    const avg = finalReactionTimes.reduce((a, b) => a + b, 0) / finalReactionTimes.length
    const best = Math.min(...finalReactionTimes)
    
    if (best < bestTime) {
      setBestTime(best)
      localStorage.setItem('bestTime', best.toString())
    }
    if (avg < avgTime) {
      setAvgTime(avg)
      localStorage.setItem('avgTime', avg.toString())
    }
    
    setPhase('finished')
  }

  const saveRanking = async (playerNickname: string) => {
    if (!playerNickname.trim()) {
      alert('닉네임을 입력해주세요!')
      return
    }

    if (!isSupabaseConfigured()) {
      alert('⚠️ 데이터베이스 연결이 설정되지 않았습니다.\n관리자에게 문의해주세요.')
      return
    }

    setIsSavingRank(true)
    try {
      const record: RankingRecord = {
        nickname: playerNickname.trim(),
        total_time: totalTime,
        captcha_time: captchaTime,
        round_times: reactionTimes
      }

      const { error } = await supabase
        .from('rankings')
        .insert([record])

      if (error) throw error

      // 닉네임 저장
      localStorage.setItem('podoal_nickname', playerNickname.trim())
      setNickname(playerNickname.trim())
      alert('🎉 랭킹이 저장되었습니다!')
      setShowNicknameInput(false)
    } catch (error) {
      console.error('Error saving ranking:', error)
      alert('랭킹 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSavingRank(false)
    }
  }

  const restartGame = () => {
    setRound(1)
    setReactionTimes([])
    setSelectedSeats(new Set())
    setCaptchaTime(0)
    setCaptchaInput('')
    setTotalStartTime(null)
    setTotalTime(0)
    setCurrentTime(0)
    setRoundStartTime(0)
    setShowNicknameInput(false)
    setQueueNumber(Math.floor(Math.random() * 6000) + 3000)
    setPhase('waitingQueue')
  }

  const goToLeaderboard = () => {
    setPhase('leaderboard')
  }
  
  const goToChat = () => {
    if (!nickname) {
      alert('채팅을 이용하려면 먼저 게임을 완료하고 닉네임을 설정해주세요!')
      return
    }
    setPhase('chat')
  }
  
  const goBackFromChat = () => {
    // 채팅방에 들어오기 전 상태로 돌아가기
    // 게임 완료 후 채팅에 들어왔다면 결과 페이지로
    if (totalTime > 0) {
      setPhase('finished')
    } else {
      setPhase('waitingQueue')
    }
  }
  
  // 접속자 수 업데이트
  useEffect(() => {
    if (!isSupabaseConfigured() || !nickname) return
    
    // 자신의 온라인 상태 업데이트
    const updateOnlineStatus = async () => {
      try {
        await supabase
          .from('online_users')
          .upsert(
            { nickname, last_seen: new Date().toISOString() },
            { onConflict: 'nickname', ignoreDuplicates: false }
          )
      } catch (error) {
        console.error('Error updating online status:', error)
      }
    }
    
    // 접속자 수 조회
    const fetchOnlineCount = async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { data, error } = await supabase
          .from('online_users')
          .select('*')
          .gte('last_seen', fiveMinutesAgo)
        
        if (error) throw error
        setOnlineUsers(data?.length || 0)
      } catch (error) {
        console.error('Error fetching online count:', error)
      }
    }
    
    // 초기 업데이트
    updateOnlineStatus()
    fetchOnlineCount()
    
    // 30초마다 상태 업데이트
    const statusInterval = setInterval(updateOnlineStatus, 30000)
    // 10초마다 접속자 수 조회
    const countInterval = setInterval(fetchOnlineCount, 10000)
    
    return () => {
      clearInterval(statusInterval)
      clearInterval(countInterval)
    }
  }, [nickname])
  
  // 채팅 메시지 로드 및 실시간 구독
  useEffect(() => {
    if (phase !== 'chat' || !isSupabaseConfigured()) return
    
    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100)
        
        if (error) throw error
        setChatMessages(data || [])
      } catch (error) {
        console.error('Error loading messages:', error)
      }
    }
    
    loadMessages()
    
    // 실시간 채팅 구독 (개선된 방식)
    const channel = supabase
      .channel('realtime:chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          console.log('New message received:', payload.new)
          setChatMessages(prev => {
            // 중복 방지
            const exists = prev.find(msg => msg.id === payload.new.id)
            if (exists) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to chat messages')
        }
      })
    
    return () => {
      console.log('Unsubscribing from chat channel')
      supabase.removeChannel(channel)
    }
  }, [phase])
  
  // 채팅 메시지 전송
  const sendMessage = async () => {
    if (!chatInput.trim() || !nickname || isSendingMessage) return
    
    setIsSendingMessage(true)
    try {
      const newMessage = {
        nickname: nickname,
        message: chatInput.trim(),
        created_at: new Date().toISOString()
      }
      
      console.log('Sending message:', newMessage)
      
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([newMessage])
        .select()
      
      if (error) throw error
      
      console.log('Message sent successfully:', data)
      setChatInput('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('메시지 전송에 실패했습니다.')
    } finally {
      setIsSendingMessage(false)
    }
  }

  return (
    <div className="app">
      {phase === 'waitingQueue' && (
        <WaitingQueueView queueNumber={queueNumber} />
      )}
      
      {phase === 'captcha' && (
        <>
          <Timer currentTime={currentTime} />
          <CaptchaView
            captchaCode={captchaCode}
            captchaInput={captchaInput}
            setCaptchaInput={setCaptchaInput}
            verifyCaptcha={verifyCaptcha}
            generateCaptcha={generateCaptcha}
          />
        </>
      )}
      
      {phase === 'playing' && (
        <>
          <Timer currentTime={currentTime} />
          <GameView
            round={round}
            totalRounds={totalRounds}
            resultText={resultText}
            seats={seats}
            handleTap={handleTap}
          />
        </>
      )}
      
      {phase === 'finished' && (
        <ResultView
          totalTime={totalTime}
          captchaTime={captchaTime}
          reactionTimes={reactionTimes}
          nickname={nickname}
          showNicknameInput={showNicknameInput}
          setShowNicknameInput={setShowNicknameInput}
          saveRanking={saveRanking}
          isSavingRank={isSavingRank}
          restartGame={restartGame}
          goToLeaderboard={goToLeaderboard}
          goToChat={goToChat}
        />
      )}
      
      {phase === 'leaderboard' && (
        <LeaderboardView onBack={() => setPhase('finished')} />
      )}
      
      {phase === 'chat' && (
        <ChatView 
          nickname={nickname}
          messages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendMessage={sendMessage}
          isSending={isSendingMessage}
          onBack={goBackFromChat}
        />
      )}
      
      {/* 왼쪽 하단 접속자 수 버튼 */}
      {phase !== 'chat' && onlineUsers > 0 && (
        <button className="online-users-button" onClick={goToChat}>
          <span className="online-icon">👥</span>
          <span className="online-count">{onlineUsers}</span>
        </button>
      )}
    </div>
  )
}

// ⏱️ 타이머 컴포넌트
function Timer({ currentTime }: { currentTime: number }) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  return (
    <div className="timer-display">
      <div className="timer-icon">⏱️</div>
      <div className="timer-value">{formatTime(currentTime)}</div>
    </div>
  )
}

// 🕓 대기열 화면
function WaitingQueueView({ queueNumber }: { queueNumber: number }) {
  return (
    <div className="waiting-queue">
      <div className="queue-content">
        <div className="logo">🍇</div>
        <h2 className="queue-label">나의 대기순서</h2>
        <div className="queue-number">{queueNumber}</div>
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${((9000 - queueNumber) / 9000) * 100}%` }}
          />
        </div>
        <p className="queue-message">현재 접속 인원이 많아 대기중입니다.</p>
      </div>
    </div>
  )
}

// 🔒 보안문자 화면
function CaptchaView({
  captchaCode,
  captchaInput,
  setCaptchaInput,
  verifyCaptcha,
  generateCaptcha
}: {
  captchaCode: string
  captchaInput: string
  setCaptchaInput: (value: string) => void
  verifyCaptcha: () => void
  generateCaptcha: () => void
}) {
  // 랜덤 스타일을 한 번만 생성 (captchaCode가 바뀔 때만)
  const charStyles = useRef<any[]>([])
  
  useEffect(() => {
    charStyles.current = captchaCode.split('').map(() => ({
      color: `hsl(${Math.random() * 60 + 180}, 70%, 60%)`,
      transform: `rotate(${Math.random() * 30 - 15}deg) translateY(${Math.random() * 10 - 5}px)`,
      fontSize: `${Math.random() * 10 + 35}px`
    }))
  }, [captchaCode])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyCaptcha()
    }
  }

  return (
    <div className="captcha-view">
      <div className="captcha-modal">
        <h1 className="captcha-title">🔒 보안문자 입력</h1>
        <p className="captcha-subtitle">부정 예매방지를 위해 보안문자를 확인하고 있습니다.</p>
        <p className="captcha-subtitle2">인증 후 좌석을 선택할 수 있습니다.</p>
        
        <div className="captcha-code-container">
          <div className="captcha-code">
            {captchaCode.split('').map((char, index) => (
              <span 
                key={index} 
                className="captcha-char"
                style={charStyles.current[index] || {}}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
        
        <div className="captcha-actions">
          <button className="captcha-refresh" onClick={generateCaptcha}>
            🔄 새로고침
          </button>
        </div>
        
        <input
          type="text"
          className="captcha-input"
          placeholder="공백없이 문자를 입력해주세요"
          value={captchaInput}
          onChange={(e) => setCaptchaInput(e.target.value)}
          onKeyPress={handleKeyPress}
          maxLength={6}
          autoFocus
        />
        
        <p className="captcha-hint">※ 문자는 대소문자를 구분하지 않습니다.</p>
        
        <button className="captcha-submit" onClick={verifyCaptcha}>
          입력완료
        </button>
      </div>
    </div>
  )
}

// 🎮 게임 화면
function GameView({
  round,
  totalRounds,
  resultText,
  seats,
  handleTap
}: {
  round: number
  totalRounds: number
  resultText: string
  seats: (Seat | null)[][]
  handleTap: (seat: Seat) => void
}) {
  return (
    <div className="game-view">
      <h1 className="game-title">🍇 포도알 – 티켓팅 트레이너</h1>
      <p className="result-text">{resultText}</p>
      <p className="round-text">Round {round} / {totalRounds}</p>
      
      <div className="seats-container">
        {seats.map((row, r) => (
          <div key={r} className="seat-row">
            {row.map((seat, c) => 
              seat ? (
                <button
                  key={`${r}-${c}`}
                  className={`seat ${seat.isActive ? 'active' : 'inactive'}`}
                  onClick={() => handleTap(seat)}
                  disabled={!seat.isActive}
                />
              ) : (
                <div key={`${r}-${c}`} className="seat empty" />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 📊 결과 화면
function ResultView({
  totalTime,
  captchaTime,
  reactionTimes,
  nickname,
  showNicknameInput,
  setShowNicknameInput,
  saveRanking,
  isSavingRank,
  restartGame,
  goToLeaderboard,
  goToChat
}: {
  totalTime: number
  captchaTime: number
  reactionTimes: number[]
  nickname: string
  showNicknameInput: boolean
  setShowNicknameInput: (show: boolean) => void
  saveRanking: (nickname: string) => void
  isSavingRank: boolean
  restartGame: () => void
  goToLeaderboard: () => void
  goToChat: () => void
}) {
  const [tempNickname, setTempNickname] = useState(nickname)
  const [rankPercentile, setRankPercentile] = useState<number | null>(null)
  const [loadingRank, setLoadingRank] = useState(true)
  const [isBreakdownCollapsed, setIsBreakdownCollapsed] = useState(true)

  useEffect(() => {
    calculateRank()
  }, [totalTime])

  const calculateRank = async () => {
    setLoadingRank(true)
    try {
      if (!isSupabaseConfigured()) {
        setRankPercentile(null)
        setLoadingRank(false)
        return
      }

      // 전체 랭킹 데이터 조회
      const { data, error } = await supabase
        .from('rankings')
        .select('total_time')
        .order('total_time', { ascending: true })

      if (error) throw error

      if (!data || data.length === 0) {
        setRankPercentile(null)
        setLoadingRank(false)
        return
      }

      // 현재 시간보다 빠른 사람 수 계산
      const fasterCount = data.filter(rank => rank.total_time < totalTime).length
      const totalCount = data.length + 1 // 현재 사용자 포함
      const percentile = ((fasterCount + 1) / totalCount) * 100

      setRankPercentile(percentile)
    } catch (error) {
      console.error('Error calculating rank:', error)
      setRankPercentile(null)
    } finally {
      setLoadingRank(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(3)
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`
  }

  const getRankMessage = () => {
    if (loadingRank) return '순위 계산중...'
    if (rankPercentile === null) return '첫 번째 도전자!'
    
    if (rankPercentile <= 1) return '🏆 TOP 1% 전설의 손가락!'
    if (rankPercentile <= 5) return '🥇 상위 5% 티켓팅 고수!'
    if (rankPercentile <= 10) return '🥈 상위 10% 빠른 손가락!'
    if (rankPercentile <= 25) return '🥉 상위 25% 우수한 실력!'
    if (rankPercentile <= 50) return '📈 상위 50% 평균 이상!'
    return `📊 상위 ${rankPercentile.toFixed(1)}%`
  }

  const getRankColor = () => {
    if (rankPercentile === null) return '#FCD34D'
    if (rankPercentile <= 5) return '#FFD700'
    if (rankPercentile <= 25) return '#FFA500'
    return '#5EEAD4'
  }

  const detailSum = captchaTime + reactionTimes.reduce((a, b) => a + b, 0)

  const handleSaveClick = () => {
    if (nickname) {
      saveRanking(nickname)
    } else {
      setShowNicknameInput(true)
    }
  }

  const handleNicknameSubmit = () => {
    saveRanking(tempNickname)
  }

  return (
    <div className="result-view">
      <ConfettiAnimation />
      <div className="result-card">
        <h1 className="result-title">🎉 예매 성공!</h1>
        <p className="result-subtitle">티켓팅에 성공했습니다!</p>
        
        <div className="total-time-display">
          <div className="total-time-label">⏱️ 총 소요 시간</div>
          <div className="total-time-value">{formatTime(totalTime)}</div>
          <div className="total-time-ms">{totalTime.toFixed(3)}초</div>
          <div 
            className="rank-percentile" 
            style={{ color: getRankColor() }}
          >
            {getRankMessage()}
          </div>
        </div>
        
        <div className={`time-breakdown ${isBreakdownCollapsed ? 'collapsed' : ''}`}>
          <div 
            className="breakdown-toggle" 
            onClick={() => setIsBreakdownCollapsed(!isBreakdownCollapsed)}
          >
            <h3 className="breakdown-title">📊 세부 기록</h3>
            <span className="breakdown-toggle-icon">
              {isBreakdownCollapsed ? '▼' : '▲'}
            </span>
          </div>
          
          {!isBreakdownCollapsed && (
            <div className="breakdown-content">
              <div className="breakdown-item">
                <span className="breakdown-label">🔒 보안문자</span>
                <span className="breakdown-value">{captchaTime.toFixed(3)}초</span>
              </div>
              {reactionTimes.map((time, index) => (
                <div key={index} className="breakdown-item">
                  <span className="breakdown-label">Round {index + 1}</span>
                  <span className="breakdown-value">{time.toFixed(3)}초</span>
                </div>
              ))}
              <div className="breakdown-item breakdown-total">
                <span className="breakdown-label">합계</span>
                <span className="breakdown-value">{detailSum.toFixed(3)}초</span>
              </div>
            </div>
          )}
        </div>

        {showNicknameInput ? (
          <div className="nickname-input-container">
            <input
              type="text"
              className="nickname-input"
              placeholder="닉네임 입력 (2-10자)"
              value={tempNickname}
              onChange={(e) => setTempNickname(e.target.value)}
              maxLength={10}
              autoFocus
            />
            <button 
              className="save-rank-button" 
              onClick={handleNicknameSubmit}
              disabled={isSavingRank || tempNickname.trim().length < 2}
            >
              {isSavingRank ? '저장중...' : '✅ 랭킹 저장'}
            </button>
          </div>
        ) : (
          <button className="save-rank-button" onClick={handleSaveClick} disabled={isSavingRank}>
            {nickname ? `🏆 ${nickname}으로 랭킹 저장` : '🏆 랭킹 저장'}
          </button>
        )}
        
        <div className="result-buttons">
          <button className="leaderboard-button" onClick={goToLeaderboard}>
            📊 랭킹 보기
          </button>
          <button className="chat-button" onClick={goToChat}>
            💬 채팅방
          </button>
          <button className="restart-button" onClick={restartGame}>
            🔄 다시 도전
          </button>
        </div>
      </div>
    </div>
  )
}

// 🎉 컨페티 애니메이션
function ConfettiAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<ConfettiParticle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Initialize particles
    particlesRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 5 + 5,
      color: ['#9333EA', '#EC4899', '#5EEAD4', '#FCD34D', '#FB923C'][
        Math.floor(Math.random() * 5)
      ],
      speed: Math.random() * 3 + 1,
      offset: Math.random() * Math.PI * 2
    }))

    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach(p => {
        p.y += p.speed
        p.x += Math.sin(Date.now() / 1000 + p.offset) * 2
        
        if (p.y > canvas.height) {
          p.y = -10
          p.x = Math.random() * canvas.width
        }

        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => cancelAnimationFrame(animationId)
  }, [])

  return <canvas ref={canvasRef} className="confetti-canvas" />
}

// 🏆 리더보드 화면
function LeaderboardView({ onBack }: { onBack: () => void }) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [rankings, setRankings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRankings()
  }, [period])

  const loadRankings = async () => {
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        setRankings([])
        setLoading(false)
        return
      }

      let query = supabase
        .from('rankings')
        .select('*')
        .order('total_time', { ascending: true })
        .limit(100)

      const now = new Date()
      
      if (period === 'daily') {
        const today = now.toISOString().split('T')[0]
        query = query.gte('created_at', `${today}T00:00:00`)
      } else if (period === 'weekly') {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        query = query.gte('created_at', weekStart.toISOString())
      } else if (period === 'monthly') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        query = query.gte('created_at', monthStart.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      setRankings(data || [])
    } catch (error) {
      console.error('Error loading rankings:', error)
      setRankings([])
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    return `${seconds.toFixed(3)}초`
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `${rank}`
  }

  const getPeriodLabel = () => {
    if (period === 'daily') return '일간'
    if (period === 'weekly') return '주간'
    return '월간'
  }

  return (
    <div className="leaderboard-view">
      <div className="leaderboard-container">
        <button className="back-button" onClick={onBack}>
          ← 돌아가기
        </button>
        
        <h1 className="leaderboard-title">🏆 랭킹 보드</h1>
        
        <div className="period-tabs">
          <button 
            className={`period-tab ${period === 'daily' ? 'active' : ''}`}
            onClick={() => setPeriod('daily')}
          >
            📅 일간
          </button>
          <button 
            className={`period-tab ${period === 'weekly' ? 'active' : ''}`}
            onClick={() => setPeriod('weekly')}
          >
            📆 주간
          </button>
          <button 
            className={`period-tab ${period === 'monthly' ? 'active' : ''}`}
            onClick={() => setPeriod('monthly')}
          >
            📊 월간
          </button>
        </div>

        <div className="period-info">
          {getPeriodLabel()} 랭킹 (상위 100명)
        </div>

        {loading ? (
          <div className="loading-spinner">⏳ 로딩중...</div>
        ) : rankings.length === 0 ? (
          <div className="no-rankings">
            아직 {getPeriodLabel()} 랭킹이 없습니다.<br />
            첫 번째 랭커가 되어보세요! 🚀
          </div>
        ) : (
          <div className="rankings-list">
            {rankings.map((rank, index) => (
              <div key={rank.id} className={`rank-item ${index < 3 ? 'top-three' : ''}`}>
                <div className="rank-position">{getRankEmoji(index + 1)}</div>
                <div className="rank-info">
                  <div className="rank-nickname">{rank.nickname}</div>
                  <div className="rank-time">{formatTime(rank.total_time)}</div>
                </div>
                <div className="rank-date">
                  {new Date(rank.created_at).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 💬 채팅 화면
function ChatView({ 
  nickname, 
  messages, 
  chatInput, 
  setChatInput, 
  sendMessage, 
  isSending,
  onBack 
}: {
  nickname: string
  messages: any[]
  chatInput: string
  setChatInput: (value: string) => void
  sendMessage: () => void
  isSending: boolean
  onBack: () => void
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  
  return (
    <div className="chat-view">
      <div className="chat-container">
        <div className="chat-header">
          <button className="chat-back-button" onClick={onBack}>
            ← 뒤로
          </button>
          <h2 className="chat-title">💬 채팅방</h2>
          <div className="chat-subtitle">실시간 채팅</div>
        </div>
        
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <span className="chat-empty-icon">💬</span>
              <p>아직 메시지가 없습니다.</p>
              <p className="chat-empty-subtitle">첫 메시지를 남겨보세요!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwnMessage = msg.nickname === nickname
              const messageTime = msg.created_at 
                ? new Date(msg.created_at).toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                : ''
              
              return (
                <div 
                  key={msg.id || index} 
                  className={`chat-message ${isOwnMessage ? 'own-message' : ''}`}
                >
                  {!isOwnMessage && (
                    <div className="message-nickname">{msg.nickname || '익명'}</div>
                  )}
                  <div className="message-bubble">
                    <div className="message-text">{msg.message}</div>
                    {messageTime && (
                      <div className="message-time">{messageTime}</div>
                    )}
                  </div>
                  {isOwnMessage && (
                    <div className="message-nickname own-nickname">{msg.nickname}</div>
                  )}
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder={nickname ? "메시지를 입력하세요..." : "닉네임을 먼저 설정해주세요"}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!nickname || isSending}
            maxLength={200}
          />
          <button 
            className="chat-send-button" 
            onClick={sendMessage}
            disabled={!chatInput.trim() || !nickname || isSending}
          >
            {isSending ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
