# Public workflow

Download [H3_DIRECTOR_STUDIO_V1_PUBLIC.json](H3_DIRECTOR_STUDIO_V1_PUBLIC.json) and drag it onto the ComfyUI canvas after installing H3 Director Studio and the upstream dependencies described in [DEPENDENCIES.md](../docs/DEPENDENCIES.md) and [INSTALLATION.md](../docs/INSTALLATION.md).

The example retains all 11 original nodes and 14 graph links, including the Deno reference image loader, independent BASE and UPSCALE LoRA stacks, UPSCALE-only Attention backend, VHS video output and Pixaroma timer.

The published copy removes local output preview history, machine-specific file paths, saved timer runtime data and the prior project identifier. Model and LoRA selections are **illustrative tested preferences** and must exist in the user's own ComfyUI setup. Reference images and prompt text are not included.

**Validation:** JSON structure and node/link counts checked against the source. Clean installation and end-to-end render execution have not been verified independently.
