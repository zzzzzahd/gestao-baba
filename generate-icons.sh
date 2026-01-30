#!/bin/bash

# Script para gerar ícones do PWA
# Execute: chmod +x generate-icons.sh && ./generate-icons.sh

echo "🎨 Gerando ícones do PWA..."

# Cria diretório de ícones
mkdir -p public/icons

# Tamanhos necessários para PWA
SIZES=(72 96 128 144 152 192 384 512)

# Verifica se o ImageMagick está instalado
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick não encontrado!"
    echo ""
    echo "📝 INSTRUÇÕES PARA CRIAR ÍCONES MANUALMENTE:"
    echo ""
    echo "1. Crie uma imagem 512x512px com o logo do DRAFT"
    echo "2. Use um gerador online como:"
    echo "   - https://realfavicongenerator.net/"
    echo "   - https://www.pwabuilder.com/imageGenerator"
    echo ""
    echo "3. Ou use Photoshop/Figma para criar os seguintes tamanhos:"
    for size in "${SIZES[@]}"; do
        echo "   - icon-${size}x${size}.png"
    done
    echo ""
    echo "4. Salve todos em: public/icons/"
    echo ""
    echo "💡 DESIGN SUGERIDO:"
    echo "   - Fundo: #0d0d0d (preto)"
    echo "   - Ícone: Clipboard + User (Font Awesome)"
    echo "   - Cores: Cyan Electric (#00f2ff) e branco"
    echo "   - Borda arredondada de 15% (maskable)"
    exit 1
fi

# Se ImageMagick estiver instalado, gera ícones
echo "✅ ImageMagick encontrado! Gerando ícones..."

# Cria ícone base (você deve substituir isso por um design real)
convert -size 512x512 xc:#0d0d0d \
    -gravity center \
    -fill '#00f2ff' \
    -font Arial-Bold \
    -pointsize 200 \
    -annotate +0+0 "D" \
    public/icons/icon-512x512.png

# Gera todos os tamanhos
for size in "${SIZES[@]}"; do
    if [ $size -ne 512 ]; then
        echo "Gerando ${size}x${size}..."
        convert public/icons/icon-512x512.png \
            -resize ${size}x${size} \
            public/icons/icon-${size}x${size}.png
    fi
done

echo "✅ Ícones gerados com sucesso!"
echo "📁 Localização: public/icons/"
