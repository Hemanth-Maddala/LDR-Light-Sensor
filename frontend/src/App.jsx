
import { useEffect, useState } from 'react'
import circuitImage from '../images/circuit.png'
import './App.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const DEFAULT_RANGE = { min: 1.29, max: 4.99 }

function getApiError(payload, status) {
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((item) => item.msg).join(' ')
  }

  return payload?.detail || payload?.message || `Request failed (${status}).`
}

function getFriendlyError(requestError) {
  const rawMessage = requestError instanceof Error
    ? requestError.message
    : String(requestError ?? '')

  const normalized = rawMessage.toLowerCase()

  if (
    normalized.includes('clipboard') ||
    normalized.includes('does not support image')
  ) {
    return 'This model does not support image input. Please use a numeric voltage reading instead of an image.'
  }

  if (requestError instanceof TypeError) {
    return 'Could not reach the prediction API. Start the backend and try again.'
  }

  return rawMessage || 'The prediction could not be completed.'
}

function App() {
  const [voltage, setVoltage] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [voltageRange, setVoltageRange] = useState(DEFAULT_RANGE)

  // Theme handling
  useEffect(() => {
  const theme = getBrightnessMode(result?.brightness)

  document.documentElement.dataset.theme = theme

  console.log('Brightness:', result?.brightness)
  console.log('Applied theme:', theme)
}, [result])

  // Fetch backend health and voltage range
  useEffect(() => {
    const controller = new AbortController()

    fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal
    })
      .then(async (response) => {
        const data = await response.json()

        if (!response.ok) {
          throw new Error(getApiError(data, response.status))
        }

        return data
      })
      .then((data) => {
        if (data.voltage_range) {
          setVoltageRange(data.voltage_range)
        }
      })
      .catch(() => {
        // Health check is best effort.
      })

    return () => controller.abort()
  }, [])

  
function getBrightnessMode(brightness) {
  const value = String(brightness ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

  const brightValues = [
    'bright',
    'brightness',
    'high',
    'normal',
    'high brightness',
    'normal brightness'
  ]

  if (brightValues.includes(value)) {
    return 'bright'
  }

  if (value === 'dark') {
    return 'dark'
  }

  console.warn('Unknown brightness value:', brightness)

  return 'dark'
}


  // Handle prediction
  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')

    const numericVoltage = Number(voltage)

    if (!Number.isFinite(numericVoltage)) {
      setError('Enter a valid voltage reading.')
      return
    }

    if (
      numericVoltage < voltageRange.min ||
      numericVoltage > voltageRange.max
    ) {
      setError(
        `Use a reading from ${voltageRange.min.toFixed(2)} V to ${voltageRange.max.toFixed(2)} V.`
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          voltage: numericVoltage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(getApiError(data, response.status))
      }

      setResult(data)

    } catch (requestError) {
      setError(getFriendlyError(requestError))

    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell">

      <header className="topbar">
        <a
          className="wordmark"
          href="#home"
          aria-label="Lumen LDR home"
        >
          <span className="wordmark-icon" aria-hidden="true">
            L
          </span>

          <span>
            LUMEN
            <span className="wordmark-sub">
              {' / LDR LIGHT SENSOR '}
            </span>
          </span>
        </a>
      </header>

      <section className="intro" id="home">
        <p className="eyebrow">
          LIGHT DEPENDENT RESISTOR · LIGHT SENSOR ANALYSIS
        </p>

        <h1>
          Read the light
          <br />
          <span>in the voltage.</span>
        </h1>

        <p className="intro-copy">
          Enter an Arduino analog voltage to estimate the LDR resistance and
          classify the light level from your sensor circuit.
        </p>
      </section>

      <section
        className="workspace"
        aria-label="LDR prediction tool"
      >

        {/* INPUT PANEL */}

        <div className="panel input-panel">

          <div className="panel-heading">
            <span className="step-number">01</span>

            <div>
              <h2>Sensor reading</h2>
              <p>Voltage measured at analog pin A0</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            <label
              className="field-label"
              htmlFor="voltage"
            >
              Voltage
            </label>

            <div className="input-wrap">
              <input
                id="voltage"
                name="voltage"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={voltageRange.min}
                max={voltageRange.max}
                value={voltage}
                onChange={(event) => setVoltage(event.target.value)}
                placeholder="e.g. 3.40"
                aria-describedby="voltage-help"
                required
              />

              <span className="input-unit">V</span>
            </div>

            <p
              className="field-help"
              id="voltage-help"
            >
              Model range: {voltageRange.min.toFixed(2)}–{voltageRange.max.toFixed(2)} V
            </p>

            <button
              className="submit-button"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Calculating…' : 'Analyze reading'}

              {!loading && (
                <span aria-hidden="true">↗</span>
              )}
            </button>

          </form>

          {error && (
            <p
              className="message message-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {result && (
            <section
              className={
                'result-card ' +
                (getBrightnessMode(result.brightness) === 'dark'
                  ? 'is-dim'
                  : 'is-bright'
                )
              }
              aria-live="polite"
              aria-label="Prediction result"
            >

              <div className="result-topline">

                <span className="result-kicker">
                  PREDICTION
                </span>

                <span
                  className={`brightness-pill ${result.brightness === 'Dark'
                    ? 'is-dim'
                    : 'is-bright'
                    }`}
                >
                  <span
                    className="brightness-symbol"
                    aria-hidden="true"
                  >
                    {getBrightnessMode(result.brightness) === 'dark' ? '☾' : '☀'}
                  </span>

                  <span
                    className="brightness-dot"
                    aria-hidden="true"
                  />

                  {result.brightness}
                </span>

              </div>

              <p className="result-label">
                Estimated LDR resistance
              </p>

              <p className="result-value">
                {Number(result.predicted_ldr_value).toLocaleString(
                  'en-IN',
                  {
                    maximumFractionDigits: 0
                  }
                )}

                <span> Ω</span>
              </p>

              <p className="result-detail">
                From an input of {Number(result.voltage).toFixed(2)} V
              </p>

            </section>
          )}

          <p className="rule-note">
            The classifier predicts a brightness category from the estimated LDR resistance.
          </p>

        </div>

        {/* CIRCUIT PANEL */}

        <aside className="panel circuit-panel">

          <div className="panel-heading">
            <span className="step-number">02</span>

            <div>
              <h2>How it is wired</h2>
              <p>Arduino Uno · 100 kΩ divider</p>
            </div>
          </div>

          <figure className="circuit-figure">
            <img
              src={circuitImage}
              alt="Arduino Uno connected to an LDR and a 100 kilo-ohm resistor voltage divider"
            />

            <figcaption>
              Use the voltage at A0 as the reading above.
            </figcaption>
          </figure>

          <div className="polarity-note">
            <span
              className="sun-icon"
              aria-hidden="true"
            >
              ☼
            </span>

            <p>
              <strong>More light → higher voltage</strong>
              <br />
              The LDR resistance falls as the sensor gets brighter.
            </p>
          </div>

        </aside>

      </section>

      <footer className="page-footer">

        <span>
          MODEL INPUT · OUTPUT VOLTAGE OF ARDUINO
        </span>

        <span>
          TRAINED RANGE · {voltageRange.min.toFixed(2)}–{voltageRange.max.toFixed(2)} V
        </span>

        <span>
          CLASSIFIER · LDR RESISTANCE
        </span>

      </footer>

    </main>
  )
}

export default App
