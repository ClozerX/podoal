import { useState, useEffect, useRef } from 'react'
import './App.css'

type GamePhase = 'waitingQueue' | 'captcha' | 'playing' | 'finished'

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
      case 1: return [10, 14]
      case 2: return [11, 16]
      case 3: return [12, 18]
      case 4: return [13, 20]
      default: return [14, 22]
    }
  }

  const makeStairPattern = (rows: number, cols: number): (Seat | null)[][] => {
    const grid: (Seat | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null))
    for (let r = 0; r < rows; r++) {
      const limit = Math.min(cols, r + Math.floor(Math.random() * 3) + 3)
      for (let c = 0; c < limit; c++) {
        grid[r][c] = { id: `${r}-${c}-${Math.random()}`, isActive: false }
      }
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
      // 라운드 완료 시간 계산 (타이머 기준)
      if (totalStartTime) {
        const currentElapsed = (Date.now() - totalStartTime.getTime()) / 1000
        const roundTime = currentElapsed - roundStartTime
        const newReactionTimes = [...reactionTimes, roundTime]
        setReactionTimes(newReactionTimes)
        setResultText(`Round ${round} 완료: ${roundTime.toFixed(3)}초`)
        
        setTimeout(() => {
          if (round < totalRounds) {
            const nextRoundNum = round + 1
            setRound(nextRoundNum)
            nextRound(nextRoundNum, newReactionTimes)
          } else {
            endGame(newReactionTimes)
          }
        }, 1200)
      }
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
    setQueueNumber(Math.floor(Math.random() * 6000) + 3000)
    setPhase('waitingQueue')
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
          restartGame={restartGame}
        />
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
                style={{
                  color: `hsl(${Math.random() * 60 + 180}, 70%, 60%)`,
                  transform: `rotate(${Math.random() * 30 - 15}deg) translateY(${Math.random() * 10 - 5}px)`,
                  fontSize: `${Math.random() * 10 + 35}px`
                }}
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
            {row.map((seat, c) => (
              <div key={c} className="seat-wrapper">
                {seat ? (
                  <button
                    className={`seat ${seat.isActive ? 'active' : 'inactive'}`}
                    onClick={() => handleTap(seat)}
                    disabled={!seat.isActive}
                  />
                ) : (
                  <div className="seat empty" />
                )}
              </div>
            ))}
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
  restartGame
}: {
  totalTime: number
  captchaTime: number
  reactionTimes: number[]
  restartGame: () => void
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(3)
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`
  }

  // 세부 시간 합계
  const detailSum = captchaTime + reactionTimes.reduce((a, b) => a + b, 0)

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
        </div>
        
        <div className="time-breakdown">
          <h3 className="breakdown-title">📊 세부 기록</h3>
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
        
        <button className="restart-button" onClick={restartGame}>
          🔄 다시 도전하기
        </button>
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

export default App

