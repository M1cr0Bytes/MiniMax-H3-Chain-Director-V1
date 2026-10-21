# H3 Director Studio V1

> **Pre-release documentation draft.** Feature description and demo screenshots to be written with the maintainer. Installation and end-to-end Chain execution have not yet been independently validated on a clean ComfyUI installation.

A custom ComfyUI node for orchestrating MiniMax H3 video generation with BASE and UPSCALE passes and audiovisual segment continuity.

## Repository layout

- `__init__.py`: Python node implementation.
- `web/studio.js`: ComfyUI frontend panel.
- `docs/DEPENDENCIES.md`: dependencies and model setup notes.
- `docs/CREDITS.md`: upstream authors, model acknowledgements and third-party licenses.
- `workflows/`: public demonstration workflows (pending final sanitization and validation).
- `assets/`: future screenshots (not included yet).

## Installation (manual, provisional)

Clone this repository to `ComfyUI/custom_nodes/ComfyUI-H3-Director-Studio-V1`, install the third-party custom nodes documented in `docs/DEPENDENCIES.md`, and restart ComfyUI. Model weights are downloaded separately from their upstream providers. A tested installation matrix and runnable example workflow will follow.

## Notes

- This package does **not** include the local AI Writer, its Launcher, or the ProjectQueue companion node.
- No model weights, LoRAs, local image/video references, or personal example prompts are distributed.
- This project is not affiliated with or endorsed by MiniMax, ComfyUI, or upstream node authors.
- The source-code license is **not yet selected**. Do not assume that the repository's visibility grants permission for redistribution or reuse. See `docs/CREDITS.md` for third-party license considerations.

## Features / Usage / Screenshots

_To be prepared together with the maintainer before public announcement._