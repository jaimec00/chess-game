# chess rot

A browser chess game — play as white against a local AI or an LLM opponent. Built from scratch with React, Vite, and Tailwind CSS. No external chess libraries.

## Features

- **Full chess rules** — castling, en passant, pawn promotion, check/checkmate/stalemate, 50-move rule, threefold repetition, insufficient material draws
- **Local AI** — minimax with alpha-beta pruning (depth 3), runs entirely in the browser
- **LLM mode** — bring your own API key and play against Claude (Haiku or Sonnet) via the Anthropic Messages API
- **Dark glassmorphism UI** — semi-transparent panels, backdrop blur, blue-gray board tones, cburnett SVG pieces

## Tech stack

- React 19 + Vite 7
- Tailwind CSS v4 + shadcn/ui
- react-router-dom
- No chess engine dependencies — all move generation, validation, and AI evaluation is hand-written

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Choose **new game (local)** to play against the built-in AI, or **new game (api)** to play against an LLM (requires an Anthropic API key).

## Project structure

```
src/
├── engine/          # Pure JS chess engine (moves, rules, AI, notation)
├── services/llm/    # LLM API integration (Anthropic provider, prompt, key storage)
├── components/      # React UI (board, game, chat, landing page, shadcn primitives)
├── assets/pieces/   # cburnett SVG piece set (CC BY-SA 3.0)
└── index.css        # Tailwind entry + theme tokens + animations
```

## License

Piece artwork: [cburnett](https://en.wikipedia.org/wiki/User:Cburnett) SVG set from lichess.org, licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
