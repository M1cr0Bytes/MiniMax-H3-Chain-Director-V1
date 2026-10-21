# H3 Director Studio V1

![H3 Director Studio V1 — ComfyUI workflow overview](assets/h3-director-studio.png)


> **Pre-release documentation draft.** Development features below describe the current project; installation on a clean ComfyUI instance and end-to-end Chain execution with the public package still require independent validation.

**H3 Director Studio V1** is a custom ComfyUI node for controlling MiniMax H3 video generation from a centralized interface. It combines prompt and segment direction, configurable **BASE + UPSCALE** processing, and audiovisual continuity mechanisms. Users can work in **Single** or **Chain** mode without giving up ComfyUI's external node connections.

## Key features

### Integrated video direction
- Centralized video generation control panel.
- Two-stage pipeline: **BASE** generation followed by **UPSCALE**.
- **Single** and **Chain** production modes.
- Inputs for reference images, video, and audio.

### Prompt and segment management
- **General Prompt** for shared instructions.
- Independent prompts for individual video segments.
- Add segments with a dedicated button; edit them in expandable/collapsible panels.
- Select the segment to generate.

### Chain mode and continuity
- Build multi-segment sequences and control sequential execution from the Director interface.
- Save and restore continuity states between segments.
- Integrate **MiniMax H3 Motion Context** to carry forward audiovisual context.
- Trim context automatically to avoid repeated transition frames.

### Generation controls

| Setting | Control |
| --- | --- |
| Video duration | Configure clip duration |
| Aspect ratio | Select the output aspect ratio |
| BASE resolution | Set initial resolution in megapixels |
| Sampling steps | Configure BASE and UPSCALE separately |
| Sampler and scheduler | Select independently for each stage |
| Seed | Fixed or randomized |
| Render mode | **Preview BASE** or **Final** |
| Models and LoRAs | Independent configurations for BASE and UPSCALE |

### Integrated UPSCALE pipeline
- **3D latent upscaling** within the workflow.
- Configurable upscale multiplier.
- A second sampling pass for refinement of the upscaled result.

## Recommended two-stage model and LoRA setup

The workflow exposes **two separate LoRA loaders**, one for each stage. This is intentional: the first loader applies the selected **Turbo LoRA** and optional additional LoRAs during **BASE**, while the second can apply **a different Turbo LoRA** and optional enhancement LoRAs during **UPSCALE**. Different Turbo choices can therefore be tested for initial generation and final visual quality, with independently configured strengths.

### Recommended models — photorealism-oriented configuration

**H3 Director Studio V1 was developed with an emphasis on photorealism, natural textures, realistic motion, and fine visual detail.** The selections below reflect the developer's practical tests and visual preferences, **not mandatory dependencies, a universal quality ranking, or a controlled benchmark**.

**BASE models used during development:**
- **[Singularity Ref2VA v1.3](https://huggingface.co/WarmBloodAban/Minimax-h3_Singularity)** — a developer-tested MiniMax H3 variant.
- **[10Eros TURBO-hybrid Beta5](https://huggingface.co/TenStrip/10Eros-Max)** — another developer-tested MiniMax H3 variant.

**Preferred UPSCALE configuration for realistic-looking results:**
- **[MiniMax H3 FL2V Turbo 4-Step](https://huggingface.co/Comfy-Org/MiniMax-H3/blob/main/loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors)** — `minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors`. Preferred in the second sampling stage for the visual realism and quality observed in development tests. This file is labeled **FL2V**, not FL2VA; the names should not be treated as interchangeable.
- **H3 LMS latent upscaler** — `h3_upscaler_lms_v0.1`, preferred for fine detail and natural-looking textures. It is a *checkpoint used by a compatible 3D latent-upscaler node*, not an alternative node. See the [LMS model documentation](https://huggingface.co/Alissonerdx/Minimax-H3-ComfyUI/blob/main/README.md).

The two independent LoRA loaders allow different compatible Turbo and enhancement LoRAs to be selected for **BASE** and **UPSCALE**. Check that each model, LoRA, and upscaler is compatible with the chosen stage, node implementation, and settings.

**These choices are recommendations, not restrictions.** Users can select their own compatible checkpoints, LoRAs, upscalers, and processing settings to pursue realistic, cinematic, stylized, or artistic results. Model weights are not included in this repository and retain their original creators' licenses.

**The Director provides the tools. The creative choices belong to the user.**

### Attention acceleration: observed configuration

During development on the original test system, better results were observed when the **additional Attention acceleration patch was not used in BASE** and was **kept only for UPSCALE**.

- **BASE:** without the additional Attention acceleration patch.
- **UPSCALE:** with the additional Attention acceleration patch.

This refers to an **optional acceleration patch**, **not** to disabling the model's internal attention mechanism. The observed improvement is an empirical result of the original tests, not a guarantee for other checkpoints or hardware.

Likewise, using different Turbo LoRAs in the two stages is an available configuration and development preference; higher final quality is a goal of the setup, **not a universally validated outcome**. Compare configurations with controlled settings and evaluate results on your own system.

## Flexible external connections

Although the Director offers a centralized interface, its **external ComfyUI node connections remain visible and accessible**. Users can adapt the workflow to their preferred setup, for example by:

- Connecting different model loaders and LoRA configurations.
- Providing alternative reference image, video, or audio sources.
- Integrating additional ComfyUI processing nodes.
- Experimenting with other supported generation arrangements.

The goal is integrated direction **without locking users into one fixed node graph**. Compatibility with every possible external configuration has not been verified.

## Validation status

**Implemented in the development project:** Director interface; BASE and UPSCALE stages; Single/Chain controls; prompt and segment editors; stage-specific configuration; continuity-state and Motion Context integration.

**Observed on the original development installation:** Multi-segment generation with audiovisual continuity, and improved behavior with Attention acceleration confined to UPSCALE.

**Still to validate broadly:** Clean installation, full Chain behavior with the public package, model and dependency combinations, and comparative quality across different Turbo LoRAs, checkpoints and hardware.

## Repository layout

- `__init__.py`: Python node implementation.
- `web/studio.js`: ComfyUI frontend panel.
- `docs/DEPENDENCIES.md`: dependencies and model setup notes.
- `docs/CREDITS.md`: upstream authors, model acknowledgements and third-party licenses.
- `workflows/`: [sanitized example workflow](workflows/H3_DIRECTOR_STUDIO_V1_PUBLIC.json) (runtime validation pending).
- `assets/`: project screenshots and illustrations.

## Installation (manual, provisional)

See the [step-by-step installation and validation guide](docs/INSTALLATION.md).

Clone this repository to `ComfyUI/custom_nodes/ComfyUI-H3-Director-Studio-V1`, install the third-party custom nodes documented in `docs/DEPENDENCIES.md`, and restart ComfyUI. Model weights and LoRAs must be downloaded separately from their upstream sources. A [sanitized example workflow](workflows/H3_DIRECTOR_STUDIO_V1_PUBLIC.json) is available; clean-install and end-to-end validation are still pending.

## Credits, licenses and distribution notes

See [dependencies](docs/DEPENDENCIES.md) and [credits](docs/CREDITS.md) for the upstream components used by the workflow and their respective authors and licensing information.

- The local **AI Writer**, its Launcher, and the **ProjectQueue** companion node are **not included**.
- No third-party model weights, Turbo LoRAs, local reference media or private prompts are distributed.
- This project is not affiliated with or endorsed by MiniMax, ComfyUI or upstream node authors.
- The original Director code is distributed under the [MIT License](LICENSE). Third-party nodes, adapted code (if any), and model weights retain their own licenses and notices.

*The public example workflow has been structurally checked, but it has not yet been tested on a fresh ComfyUI installation.*
