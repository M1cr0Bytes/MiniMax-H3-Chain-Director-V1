# Credits, acknowledgments, and third-party licenses

This repository orchestrates other people's engines and nodes. Their work remains theirs. Attribution does not imply endorsement, transfer of rights, or that external packages are bundled here.

| Project | Credit / role | Upstream |
|---|---|---|
| **MiniMax H3** | Base multimodal video/audio model — MiniMaxAI | https://huggingface.co/MiniMaxAI/MiniMax-H3 |
| **ComfyUI / Comfy-Org** | Runtime, native nodes, packaged MiniMax H3 weights and workflows | https://github.com/Comfy-Org/ComfyUI ; https://huggingface.co/Comfy-Org/MiniMax-H3 |
| **Deno Custom Nodes — Deno2026** | H3 reference handling nodes used by Director | https://github.com/Deno2026/comfyui-deno-custom-nodes |
| **KJNodes — Kijai** | ModelPreviewOverrideKJ | https://github.com/kijai/ComfyUI-KJNodes |
| **H3 Motion Context — NikoDemon80** | Saved-latent audiovisual continuity, loading, trimming | https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context |
| **MiniMax H3 Latent Upscaler — LBH-123-AI** | Upstream learned 3D latent upscaler | https://github.com/LBH-123-AI/Comfyui_Minimax_h3_latent_Upscaler |
| **H3 Latent Upscaler-Plus — xmarre** | Alternative maintained fork of upscaler | https://github.com/xmarre/Comfyui_Minimax_h3_latent_Upscaler-Plus |
| **Other third-party nodes** | Context windows and resolution/math utilities | **Exact installed providers and required versions pending verification** |

## License boundaries

- **Our Director's code**: no project license has yet been chosen or included. Licensing to be decided with the maintainer after checking any copied/adapted third-party code.
- **Model weights**: not distributed. MiniMax H3 lists a community license rather than a general software MIT license; see the official model card and agreement.
- **Third-party custom nodes**: installed separately and remain governed by their upstream licenses; do not assume that a dependency's license also licenses this repository.
- **Modified and derivative model variants or LoRAs**: credit the actual variant creator and link to its own model card once a public workflow uses that specific variant.
- **Commercial usage**: consult MiniMax/Comfy's current commercial licensing guidance before using locally produced outputs commercially.

## Source material still to audit

Before selecting a code license and publishing a tagged release, confirm origin and copyright status of the internal node implementation, including any pieces adapted from third-party code. The current files refer to prior implementations and upstream components, but those references alone do not establish provenance or permission.