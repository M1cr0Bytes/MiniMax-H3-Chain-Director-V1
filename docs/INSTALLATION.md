# Installation guide

This guide describes the manual installation of H3 Director Studio V1 and its public example workflow.

## 1. Prepare ComfyUI

Use a current ComfyUI installation with a compatible Python/PyTorch/GPU environment. Check the [ComfyUI project](https://github.com/Comfy-Org/ComfyUI) for platform-specific installation instructions.

## 2. Install H3 Director Studio

From the `ComfyUI/custom_nodes` directory, run:

```bash
git clone https://github.com/M1cr0Bytes/MiniMax-H3-Chain-Director-V1.git ComfyUI-H3-Director-Studio-V1
```

Or download the repository as ZIP and extract it to `ComfyUI/custom_nodes/ComfyUI-H3-Director-Studio-V1`. Confirm that the directory directly contains `__init__.py` and `web/studio.js` (not a second nested folder).

## 3. Install upstream custom nodes

Consult [DEPENDENCIES.md](DEPENDENCIES.md) for source links and attribution. The Director backend references nodes from Deno Custom Nodes, H3 Motion Context, KJNodes, and an H3 latent upscaler implementation, among others. The package sources are now listed; minimum compatible versions remain **unpinned**. Follow each upstream project's own installation instructions. No single automated install command has been verified for this bundle.

**Reference-loader requirement:** install [Deno Custom Nodes](https://github.com/Deno2026/comfyui-deno-custom-nodes) for both `DenoMiniMaxH3ReferenceImageLoader` (visible image-reference panel) and `DenoMiniMaxH3ReferenceToVideo` (used by the Director internally).

**Pixaroma requirement for the demonstrated graph:** install [ComfyUI-Pixaroma](https://gitlab.com/pixaroma/comfyui-pixaroma) to load its `PixaromaRunTimer` without a missing-node warning. This disconnected timer measures generation time and is **not needed for the Director's underlying video generation**. Upstream installation: from `custom_nodes`, run `git clone https://gitlab.com/pixaroma/comfyui-pixaroma.git` and restart ComfyUI.

The provided workflow uses **rgthree-comfy**, **VideoHelperSuite**, and **Pixaroma**. Install all three to load that JSON without missing-node warnings. They are not all needed merely to register the Director node.

## 4. Install model files

Install suitable MiniMax H3 model weights, text encoder, video and audio VAEs, latent upscaler weights and any optional LoRAs using the corresponding upstream instructions and licenses. The workflow's selected model/LoRA files are examples; select compatible alternatives as needed.

**Live monitor:** Install and enable the KJNodes package. During generation, the Director listens to `kj_preview_override` events from the existing `ModelPreviewOverrideKJ` node to display a preview. Progress updates are also shown. No separate monitoring node is required.

## 5. Restart and verify node registration

Restart the ComfyUI server and reload its web page. Search for **H3 Director Studio** in Add Node. If it does not appear, inspect the server console for import errors or missing upstream nodes. A missing node in an imported graph typically means an additional custom-node package must be installed.

## 6. Verify your installation

Use a short test clip and your own authorized references to check the installation:

1. **Single, BASE Preview:** ensure a basic generation completes and returns frames and audio.
2. **Single, Final:** enable UPSCALE; confirm the second pass completes and that outputs are connected to your chosen export node.
3. **Chain, two segments:** check loading and saving of continuity states; verify segment selection and progression.
4. **Chain, audio and trim:** inspect transition frames, dialogue timing, and final audiovisual synchronization.
5. **Different LoRA configurations:** optionally compare BASE and UPSCALE settings independently.

Hardware and package versions may affect results; consult the upstream nodes' documentation when troubleshooting.

## Troubleshooting

- **Node missing:** check the correct folder structure and the server startup log.
- **Missing nodes when loading a graph:** install the node providers indicated by that graph and cross-check [DEPENDENCIES.md](DEPENDENCIES.md).
- **Model not found:** verify that all weights are in the model directories expected by their loaders and restart ComfyUI.
- **Chain fails:** inspect the console and Motion Context state/path settings before deleting saved context.
