# Shruti Monitor

A real-time progressive web app (PWA) designed to monitor vocal pitch, specifically calibrated for Indian Classical Music (ICM) utilizing Just Intonation.

## Tech Stack
*   **Frontend**: Vanilla HTML/JS/CSS, prioritizing layout flexibility and performance without framework overhead.
*   **Visualizer**: HTML5 Canvas rendering at 60FPS for lag-free visuals of ongoing audio.
*   **Audio Engine**: Web Audio API handling real-time microphone streams via short buffering (`20-40ms` frames).
*   **Algorithm**: Robust pitch detection (YIN or McLeod Pitch Method) to cleanly process microtonal vocal passages with high precision.

## Core Features
### Mathematical Tuning Model
Unlike standard Western 12-Tone Equal Temperament (12-TET), Shruti Monitor implements highly accurate tuning via **Just Intonation**, derived from exact frequency ratios relative to a customizable Tonic (Sa):

| Swara | Ratio |
|---|---|
| Sa | 1/1 |
| Komal Re | 16/15 |
| Shuddha Re | 9/8 |
| Komal Ga | 6/5 |
| Shuddha Ga | 5/4 |
| Shuddha Ma | 4/3 |
| Tivra Ma | 45/32 |
| Pa | 3/2 |
| Komal Dha | 8/5 |
| Shuddha Dha | 5/3 |
| Komal Ni | 9/5 |
| Shuddha Ni | 15/8 |

### Real-Time Continuous Graph UI
The primary visual interface uses horizontal infinite-scrolling mapping history precisely along a Just-Intonation y-axis. The line algorithm features a weighted dynamic smoothing function, capturing slow glides (Meend) continuously and seamlessly without pixel-jumping visual artifacts.
