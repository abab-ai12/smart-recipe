import { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface RecipeImageInput {
  id?: number;
  title: string;
  category?: string;
  image_prompt?: string;
  image_url?: string;
  image_source?: string;
}

function hashText(text: string) {
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getRecipeImageUrl(recipe: RecipeImageInput) {
  const prompt = recipe.image_prompt?.trim()
    || `${recipe.title}, ${recipe.category || 'Chinese food'}, appetizing realistic food photography`;

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=900&height=560&seed=${recipe.id || hashText(recipe.title)}&nologo=true`;
}

export function getRecipeImageFallback(recipe: RecipeImageInput) {
  const seed = recipe.id || hashText(recipe.title);
  const hue = seed % 360;

  return {
    background: `
      radial-gradient(circle at 50% 42%, rgba(255,255,255,0.98) 0 24%, transparent 25%),
      radial-gradient(circle at 50% 42%, hsla(${hue}, 76%, 48%, 0.9) 0 35%, transparent 36%),
      radial-gradient(circle at 34% 35%, hsla(${(hue + 70) % 360}, 78%, 54%, 0.85) 0 7%, transparent 8%),
      radial-gradient(circle at 61% 32%, hsla(${(hue + 125) % 360}, 70%, 45%, 0.8) 0 8%, transparent 9%),
      radial-gradient(circle at 56% 56%, hsla(${(hue + 24) % 360}, 85%, 58%, 0.85) 0 9%, transparent 10%),
      linear-gradient(135deg, hsl(${hue}, 72%, 35%), hsl(${(hue + 34) % 360}, 76%, 48%))
    `
  };
}

export function RecipeVisual({ recipe, className = '' }: { recipe: RecipeImageInput; className?: string }) {
  const [matchedImage, setMatchedImage] = useState('');
  const [imageSource, setImageSource] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (recipe.image_url) {
      setMatchedImage(recipe.image_url);
      setImageSource(recipe.image_source || 'cached');
      setImageFailed(false);
      return;
    }

    if (!recipe.id) {
      setMatchedImage('');
      setImageSource('');
      setImageFailed(false);
      return;
    }

    setMatchedImage('');
    setImageSource('');
    setImageFailed(false);

    apiClient.get(`/api/recipes/${recipe.id}/image`)
      .then((res) => {
        if (isMounted) {
          setMatchedImage(res.data?.image || '');
          setImageSource(res.data?.source || '');
          setImageFailed(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMatchedImage('');
          setImageSource('');
          setImageFailed(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [recipe.id, recipe.image_source, recipe.image_url]);

  const imageUrl = matchedImage || getRecipeImageUrl(recipe);

  return (
    <div className={`relative overflow-hidden ${className}`} style={getRecipeImageFallback(recipe)}>
      {!imageFailed && (
        <img
          key={imageUrl}
          src={imageUrl}
          alt={recipe.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
          onError={() => {
            setImageFailed(true);
          }}
        />
      )}
      <div className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
        {recipe.category || '菜单'}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-5">
        <p className="text-xs font-medium text-white/80" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
          {imageSource === 'themealdb' ? '菜品 API 展示图' : 'AI 菜品视觉图'}
        </p>
        <h3 className="mt-1 text-2xl font-bold text-white drop-shadow" style={{ color: '#ffffff' }}>{recipe.title}</h3>
      </div>
    </div>
  );
}

export function buildRecipeSummary(recipe: { summary?: string; instructions: string }) {
  if (recipe.summary?.trim()) {
    return recipe.summary.trim();
  }

  const plainInstructions = recipe.instructions.replace(/\s+/g, ' ').trim();
  return plainInstructions.length > 96 ? `${plainInstructions.slice(0, 96)}...` : plainInstructions;
}
