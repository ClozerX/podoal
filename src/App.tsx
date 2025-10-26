import { useState, useEffect, useRef } from 'react'
import './App.css'

type GamePhase = 'waitingQueue' | 'countdown' | 'playing' | 'finished'

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
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [resultText, setResultText] = useState('대기중...')
  const [openSeats, setOpenSeats] = useState<string[]>([])
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set())
  
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
            setPhase('playing')
            startGame()
          }, 200)
        }
        return Math.max(0, next)
      })
    }, 800)
    
    return () => clearInterval(interval)
  }, [phase])

  // ✅ Countdown logic (disabled - skipping countdown)
  // useEffect(() => {
  //   if (phase !== 'countdown') return
  //   
  //   setTimerCount(3)
  //   const interval = setInterval(() => {
  //     setTimerCount(prev => {
  //       if (prev > 0) {
  //         return prev - 1
  //       } else {
  //         clearInterval(interval)
  //         setTimeout(() => {
  //           setPhase('playing')
  //           startGame()
  //         }, 500)
  //         return 0
  //       }
  //     })
  //   }, 1000)
  //   
  //   return () => clearInterval(interval)
  // }, [phase])

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
    setStartTime(new Date())
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
      // 라운드 완료 시간 계산
      if (startTime) {
        const completionTime = (Date.now() - startTime.getTime()) / 1000
        const newReactionTimes = [...reactionTimes, completionTime]
        setReactionTimes(newReactionTimes)
        setResultText(`Round ${round} 완료: ${completionTime.toFixed(3)}초`)
        
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
    setQueueNumber(Math.floor(Math.random() * 6000) + 3000)
    setPhase('waitingQueue')
  }

  return (
    <div className="app">
      {phase === 'waitingQueue' && (
        <WaitingQueueView queueNumber={queueNumber} />
      )}
      
      {phase === 'playing' && (
        <GameView
          round={round}
          totalRounds={totalRounds}
          resultText={resultText}
          seats={seats}
          handleTap={handleTap}
        />
      )}
      
      {phase === 'finished' && (
        <ResultView
          bestTime={bestTime}
          avgTime={avgTime}
          reactionTimes={reactionTimes}
          restartGame={restartGame}
        />
      )}
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
  bestTime,
  avgTime,
  reactionTimes,
  restartGame
}: {
  bestTime: number
  avgTime: number
  reactionTimes: number[]
  restartGame: () => void
}) {
  return (
    <div className="result-view">
      <ConfettiAnimation />
      <div className="result-card">
        <h1 className="result-title">🎉 축하합니다!</h1>
        <p className="result-subtitle">티켓 예메에 성공했습니다!</p>
        
        <div className="round-times">
          <h3 className="round-times-title">⏱️ 라운드별 기록</h3>
          {reactionTimes.map((time, index) => (
            <div key={index} className="round-time-item">
              <span className="round-label">Round {index + 1}</span>
              <span className="round-time">{time.toFixed(3)}초</span>
            </div>
          ))}
        </div>
        
        <p className="result-stats">
          🏁 최고: {bestTime.toFixed(3)}s  평균: {avgTime.toFixed(3)}s
        </p>
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

