# Dependencies — H3 Director Studio V1

This list is based on **the published `__init__.py` backend and the 11-node public workflow**. Installing the repository alone does not install its upstream ComfyUI nodes. Use current compatible ComfyUI (including the core nodes listed below).

## Required custom-node packages

| Package | Nodes used by the Director / example workflow | Upstream |
|---|---|---|
| **Deno Custom Nodes — Deno2026** | `DenoMiniMaxH3ReferenceToVideo` (internal BASE/UPSCALE); `DenoMiniMaxH3ReferenceImageLoader` (external reference loader) | https://github.com/Deno2026/comfyui-deno-custom-nodes |
| **H3 Motion Context — NikoDemon80** | `MiniMaxH3MotionContext`, `MiniMaxH3MotionContextLoadLatent`, `MiniMaxH3MotionContextSaveLatent`, `MiniMaxH3MotionContextTrim` | https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context |
| **KJNodes — Kijai** | `ModelPreviewOverrideKJ` (internal); `kj_preview_override` frontend event supplies animated live previews | https://github.com/kijai/ComfyUI-KJNodes |
| **H3 latent upscaler implementation** | `MinimaxH3LatentUpscaler3D` (internal in Final/UPSCALE) | Upstream: https://github.com/LBH-123-AI/Comfyui_Minimax_h3_latent_Upscaler ; variant: https://github.com/xmarre/Comfyui_Minimax_h3_latent_Upscaler-Plus |
| **OBVPM Timeline — chanon** | `H3ContextWindows` (internal in Final/UPSCALE) | https://github.com/chanon/comfyui-obvpm-timeline |
| **rgthree-comfy** | `Lora Loader Stack (rgthree)` (two external nodes: BASE and UPSCALE) | https://github.com/rgthree/rgthree-comfy |
| **VideoHelperSuite** | `VHS_VideoCombine` (video+audio export) | https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite |
| **ComfyUI-Pixaroma — Pixaroma** | `PixaromaRunTimer` (disconnected timer in public workflow) | https://gitlab.com/pixaroma/comfyui-pixaroma |

**Important distinctions:** Pixaroma's timer is required to open the example workflow without a missing-node alert, but not to generate video. VideoHelperSuite and rgthree are needed to load the example workflow **as supplied**; they are not internal dependencies of the Director's Python class. The H3 latent upscaler is used when the Final/UPSCALE branch executes.

## ComfyUI built-in nodes

These nodes are supplied by **ComfyUI core**, not separate custom-node packs:

- `ResolutionSelector`, `ComfyMathExpression` (internal size and timing expressions)
- `LTXVSeparateAVLatent`, `LTXVConcatAVLatent` (internal video/audio latent separation and merging)
- `ModelAttentionBackend` (external workflow: Comfy Kitchen attention selected for the UPSCALE model; can fall back when unsupported)
- `CLIPLoader`, `VAELoader`, `UNETLoader`, `BasicGuider`, `RandomNoise`, `KSamplerSelect`, `BasicScheduler`, `SamplerCustomAdvanced`, `VAEDecode`, `VAEDecodeAudio` and ComfyUI's `GraphBuilder` interface.

Official references:
- https://github.com/Comfy-Org/ComfyUI
- https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_lt.py
- https://github.com/Comfy-Org/docs/blob/main/built-in-nodes/ModelAttentionBackend.mdx

**Versions:** exact minimum-compatible versions of ComfyUI and third-party packages have **not been pinned**. Nodes being present upstream does not guarantee compatibility with older installations or other forks. Install updates from their original authors and consult the startup log for missing node registrations.

## Model weights (not bundled)

The user's ComfyUI installation must separately supply a compatible MiniMax H3 diffusion model, text encoder, video and audio VAEs, a suitable latent-upscaler checkpoint for Final/UPSCALE, and the LoRAs selected in the workflow. These assets retain their respective creators' licenses.

- Official model distribution: https://huggingface.co/MiniMaxAI/MiniMax-H3
- ComfyUI model packaging: https://huggingface.co/Comfy-Org/MiniMax-H3
- Model recommendations and attribution: [README](../README.md#recommended-models--photorealism-oriented-configuration) and [CREDITS](CREDITS.md)

Third-party weights, LoRAs and their licenses are independent of the MIT license for the Director code. Verify upstream terms, especially before commercial use.
