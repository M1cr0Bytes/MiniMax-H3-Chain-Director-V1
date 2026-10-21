# Dependencies and models — verification draft

The current `__init__.py` dynamically expands ComfyUI nodes. It imports `comfy_execution.graph_utils.GraphBuilder`, supplied by ComfyUI.

## External custom-node packages referenced in the supplied working setup

| Package / project | Example node types | Link | Status |
|---|---|---|---|
| Deno Custom Nodes | `DenoMiniMaxH3ReferenceToVideo`; optional `DenoMiniMaxH3ReferenceImageLoader` for workflows | https://github.com/Deno2026/comfyui-deno-custom-nodes | Identified |
| KJNodes | `ModelPreviewOverrideKJ` | https://github.com/kijai/ComfyUI-KJNodes | Identified |
| Other external packages | `MiniMaxH3MotionContext*`, `H3ContextWindows`, `MinimaxH3LatentUpscaler3D`, `ResolutionSelector`, `ComfyMathExpression`, `LTXVSeparateAVLatent`, `LTXVConcatAVLatent` | Source projects to be confirmed from user's installed custom_nodes | **Unverified attribution** |

Standard sampling and VAE decode nodes are supplied by ComfyUI. The supplied example workflow additionally uses `VHS_VideoCombine` (VideoHelperSuite) and optional rgthree LoRA loader; those are workflow dependencies rather than source-code imports.

**Do not publish a claim of zero external dependencies.** There is no pinned ComfyUI or custom-node version matrix yet.

## Model weights

Original MiniMax H3 models and ComfyUI-packaged variants are documented at:
- https://huggingface.co/MiniMaxAI/MiniMax-H3
- https://huggingface.co/Comfy-Org/MiniMax-H3

The user must supply compatible diffusion models, CLIP/text encoder, audio and video VAEs and the required latent upscaler, plus any optional LoRAs. Exact combinations in the public example workflow will be documented after testing; do not download an arbitrary checkpoint solely from the filename found in the author's private workflow.

**Model licensing**: Comfy-Org's MiniMax-H3 listing specifies `minimax-h3-community-license-agreement`. Model weights and any derivative fine-tunes have their own terms independent of this source-code repository. Comfy's H3 documentation states that commercially using locally generated outputs requires a MiniMax commercial license. Consult the provider's current terms for your use case.