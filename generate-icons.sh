#!/bin/bash

# Regera os ícones menores do PWA a partir da matriz 512x512 já versionada.
# Execute: bash generate-icons.sh   (ou: npm run generate-icons)
#
# A matriz é public/icons/icon-512x512.png (o ícone real do app).
# Este script NUNCA sobrescreve a matriz nem gera ícones novos do zero:
# só reduz. Para trocar o ícone, substitua a matriz por um PNG 512x512.

set -e

MASTER="public/icons/icon-512x512.png"
SIZES=(72 96 128 144 152 192 384)

if [ ! -f "$MASTER" ]; then
    echo "❌ Matriz não encontrada: $MASTER"
    exit 1
fi

if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick (convert) não encontrado. Instale-o ou gere os tamanhos com outra ferramenta"
    echo "   (ex.: sharp) a partir de $MASTER, salvando em public/icons/icon-NxN.png."
    exit 1
fi

echo "🎨 Gerando ícones a partir de $MASTER..."
for size in "${SIZES[@]}"; do
    echo "Gerando ${size}x${size}..."
    convert "$MASTER" -resize ${size}x${size} "public/icons/icon-${size}x${size}.png"
done

echo "✅ Ícones gerados em public/icons/"
