const COMFYUI_URL = process.env.COMFYUI_URL || 'http://192.168.50.241:8188';

const WORKFLOW_TEMPLATE = {
  '1': {
    class_type: 'CheckpointLoaderSimple',
    inputs: { ckpt_name: 'v1-5-pruned-emaonly.safetensors' },
  },
  '2': {
    class_type: 'LoraLoader',
    inputs: {
      lora_name: 'pixel-art-xl-v1.1.safetensors',
      strength_model: 0.85,
      strength_clip: 0.85,
      model: ['1', 0],
      clip: ['1', 1],
    },
  },
  '3': {
    class_type: 'CLIPTextEncode',
    inputs: { text: '', clip: ['2', 1] },
  },
  '4': {
    class_type: 'CLIPTextEncode',
    inputs: { text: '', clip: ['2', 1] },
  },
  '5': {
    class_type: 'EmptyLatentImage',
    inputs: { width: 512, height: 512, batch_size: 1 },
  },
  '6': {
    class_type: 'KSampler',
    inputs: {
      seed: 0,
      steps: 20,
      cfg: 7,
      sampler_name: 'euler_ancestral',
      scheduler: 'normal',
      denoise: 1,
      model: ['2', 0],
      positive: ['3', 0],
      negative: ['4', 0],
      latent_image: ['5', 0],
    },
  },
  '7': {
    class_type: 'VAEDecode',
    inputs: { samples: ['6', 0], vae: ['1', 2] },
  },
  '8': {
    class_type: 'SaveImage',
    inputs: { filename_prefix: 'yrpg', images: ['7', 0] },
  },
};

function buildWorkflow(positive: string, negative: string): Record<string, unknown> {
  const workflow = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));
  workflow['3'].inputs.text = positive;
  workflow['4'].inputs.text = negative;
  workflow['6'].inputs.seed = Math.floor(Math.random() * 2 ** 32);
  return workflow;
}

export async function generateSceneImage(
  positive: string,
  negative: string,
): Promise<string | null> {
  try {
    // Queue the prompt
    const queueRes = await fetch(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildWorkflow(positive, negative) }),
    });

    if (!queueRes.ok) {
      console.error('[ComfyUI] Queue failed:', queueRes.status);
      return null;
    }

    const { prompt_id } = (await queueRes.json()) as { prompt_id: string };

    // Poll for completion (max ~60s)
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));

      const histRes = await fetch(`${COMFYUI_URL}/history/${prompt_id}`);
      if (!histRes.ok) continue;

      const history = (await histRes.json()) as Record<string, { outputs?: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }> }>;
      const entry = history[prompt_id];
      if (!entry?.outputs) continue;

      // Find the SaveImage output
      const saveOutput = entry.outputs['8'];
      const imageInfo = saveOutput?.images?.[0];
      if (!imageInfo) continue;

      // Fetch the image
      const params = new URLSearchParams({
        filename: imageInfo.filename,
        subfolder: imageInfo.subfolder || '',
        type: imageInfo.type || 'output',
      });
      const imgRes = await fetch(`${COMFYUI_URL}/view?${params}`);
      if (!imgRes.ok) {
        console.error('[ComfyUI] Image fetch failed:', imgRes.status);
        return null;
      }

      const buffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return `data:image/png;base64,${base64}`;
    }

    console.error('[ComfyUI] Timed out waiting for image');
    return null;
  } catch (error) {
    console.error('[ComfyUI] Error:', error);
    return null;
  }
}
