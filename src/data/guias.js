// src/data/guias.js
// Conteúdo dos guias públicos do Draft Play. Dados puros (sem JSX, sem TypeScript).
// Cada bloco: { h2, p: [...], ul: [...] }  (p e ul são opcionais)
// Datas em ISO (YYYY-MM-DD). Atualize `updated` quando revisar o texto.

export const GUIAS = [
  {
    slug: "como-sortear-times-equilibrados-no-baba",
    title: "Como sortear times equilibrados no baba (sem briga)",
    description:
      "Aprenda a dividir o baba em times parelhos: por que o sorteio puro falha, como definir o nível de cada jogador e o método da serpentina.",
    published: "2026-10-12",
    updated: "2026-10-12",
    intro:
      "Todo organizador de baba já passou por isso: o sorteio sai, um time fica cheio de craques e o outro vira treino de goleada. Neste guia você vê por que isso acontece e como montar times parelhos de um jeito que o grupo aceita.",
    sections: [
      {
        h2: "Por que o sorteio no papelzinho costuma falhar",
        p: [
          "Sortear nomes de um chapéu é justo no processo, mas não no resultado. Com poucos jogadores, a chance de juntar os melhores no mesmo time é grande, e basta isso para o jogo perder a graça. O contrário também acontece: um time sem ninguém que segure a bola.",
          "Já a escolha por capitães, que parece mais equilibrada, traz outro problema: os últimos escolhidos ficam constrangidos e o capitão que escolhe os amigos primeiro acaba favorecendo o próprio time. O ideal é um critério que não dependa de sorte nem de simpatia.",
        ],
      },
      {
        h2: "Passo 1: defina um nível para cada jogador",
        p: [
          "O equilíbrio começa por saber quem é quem. Em vez de dar nota de 0 a 10, que gera discussão sobre décimos, use poucas categorias: abaixo da média, na média e acima da média. Três opções são fáceis de votar e difíceis de contestar.",
          "O nível não deve ser definido só pelo organizador. Quando o grupo vota, o resultado reflete a opinião de quem joga junto. Se houver 4 ou mais votos, vale descartar o mais alto e o mais baixo, para que uma implicância ou um favor entre amigos não pese no resultado.",
        ],
      },
      {
        h2: "Passo 2: use a distribuição em serpentina",
        p: [
          "Com os níveis definidos, ordene os confirmados do mais forte ao mais fraco e distribua assim: o primeiro vai para o time A, o segundo para o B, o terceiro para o C. Na rodada seguinte, a ordem se inverte: o quarto vai para o C, o quinto para o B, o sexto para o A. E assim por diante, indo e voltando, como uma cobra.",
          "A serpentina garante que cada time receba jogadores de todos os níveis na mesma proporção. Ninguém fica com os três melhores de uma vez e o último time não herda só os que sobraram.",
        ],
      },
      {
        h2: "Passo 3: trate os convidados avulsos",
        p: [
          "Todo baba tem o amigo de um amigo que aparece só naquele dia. Como ninguém sabe como ele joga, o mais prático é o organizador definir um nível na hora em que o convidado entra, usando o mesmo critério dos demais. O convidado participa do sorteio do dia sem precisar ser avaliado pelo grupo.",
        ],
      },
      {
        h2: "Passo 4: reservas e quantidade de jogadores",
        p: [
          "Antes de sortear, defina quantos jogam por time e se haverá reserva. Se sobrar gente, a lista de espera deve ser organizada pela ordem de confirmação, não por preferência. Quando alguém faltar ou atrasar, o primeiro da reserva entra no lugar.",
        ],
      },
      {
        h2: "Checklist rápido para o próximo baba",
        ul: [
          "Combine antes quantos jogadores por time e como funciona a reserva.",
          "Use três níveis de jogador, e não notas detalhadas.",
          "Deixe o grupo votar o nível, descartando os votos extremos quando houver 4 ou mais.",
          "Distribua em serpentina, do mais forte ao mais fraco.",
          "Defina o nível dos convidados avulsos na hora, com o mesmo critério.",
        ],
      },
      {
        h2: "Como o Draft Play automatiza isso",
        media: [
          {
            src: "/marketing/app-sorteio.webp",
            alt: "Assistente de sorteio do Draft Play listando os jogadores confirmados e os convidados do dia",
            caption: "O assistente reúne confirmados e convidados antes de montar os times.",
            width: 540,
            height: 897,
          },
          {
            src: "/marketing/sorteio-times-guia.webp",
            alt: "Configuração do sorteio de times no Draft Play, com jogadores cadastrados e número de jogadores por time",
            caption: "Você define quantos jogam por time e o app distribui em serpentina pelo nível.",
          },
        ],
        p: [
          "No Draft Play, o nível de cada jogador vem da votação do grupo, o sorteio usa a serpentina com os confirmados do dia e os convidados avulsos entram com o nível definido pelo presidente. Você também pode usar o Modo Visitante para sortear sem criar conta.",
        ],
      },
    ],
  },

  {
    slug: "como-organizar-a-lista-de-presenca-do-baba",
    title: "Como organizar a lista de presença do baba e acabar com o desfalque",
    description:
      "Um passo a passo para confirmar presença, lidar com faltas e atrasos e manter uma lista de reservas que funciona de verdade.",
    published: "2026-10-12",
    updated: "2026-10-12",
    intro:
      "A confirmação no grupo de WhatsApp é a maior fonte de dor de cabeça de quem organiza baba: mensagens perdidas, 'vou, mas talvez' e gente que some na hora. Este guia mostra como montar uma lista de presença que dá previsibilidade.",
    sections: [
      {
        h2: "O problema da confirmação solta no grupo",
        p: [
          "Quando a presença é confirmada no meio de dezenas de mensagens, o organizador precisa reler a conversa, contar nomes e lembrar quem disse 'talvez'. Qualquer descuido vira baba com gente a menos, ou a mais, e discussão sobre quem chegou primeiro.",
        ],
      },
      {
        h2: "Fixe dia, hora e local",
        p: [
          "O baba com horário certo cria hábito. Quando todo mundo sabe que o jogo é na terça às 20h, a confirmação vira rotina e a lista fecha mais rápido. Mudanças de horário devem ser exceção e avisadas com antecedência.",
        ],
      },
      {
        h2: "Defina um prazo para confirmar",
        p: [
          "Sem prazo, a confirmação vai até a hora do jogo. Estabeleça um limite, por exemplo até algumas horas antes, e deixe claro que quem não confirmar até lá entra na reserva. Isso estimula resposta e dá ao organizador tempo para buscar substitutos.",
        ],
      },
      {
        h2: "Tenha sempre uma lista de reservas",
        p: [
          "Faltas acontecem. Em vez de sair correndo para achar alguém, mantenha uma fila de reservas ordenada pela ordem de confirmação. Quando alguém desiste, o primeiro da fila entra automaticamente e o jogo não começa desfalcado.",
          "A ordem precisa ser transparente. Se todos veem a fila, ninguém reclama de favorecimento.",
        ],
      },
      {
        h2: "Como tratar faltas e atrasos",
        ul: [
          "Registre as faltas sem aviso: o histórico ajuda o grupo a decidir com justiça quem tem prioridade.",
          "Combine a regra do atraso antes: se o jogador não chegou até o início da primeira partida do time dele, o primeiro da reserva joga no lugar.",
          "Mantenha o contador de faltas visível só para quem organiza, para não expor ninguém.",
        ],
      },
      {
        h2: "Convidados avulsos",
        p: [
          "Quem vem como convidado de alguém entra na lista do dia, mas não precisa entrar no ranking. Isso evita que o histórico do grupo seja contaminado por jogadores que apareceram uma única vez.",
        ],
      },
      {
        h2: "Como o Draft Play ajuda",
        media: [
          {
            src: "/marketing/app-baba.webp",
            alt: "Painel do baba no Draft Play mostrando quanto falta para o próximo jogo, a agenda da semana e quem faz parte do grupo",
            caption: "Próximo jogo, agenda e lista de membros no mesmo painel.",
            width: 540,
            height: 897,
          },
        ],
        p: [
          "No Draft Play, os participantes confirmam presença em tempo real, a reserva é montada automaticamente e há checagem de presença antes da primeira partida de cada time. Se alguém faltar, o primeiro da reserva assume a vaga.",
        ],
      },
    ],
  },

  {
    slug: "como-cobrar-mensalidade-e-rateio-da-quadra",
    title: "Como cobrar mensalidade e rateio da quadra no baba",
    description:
      "Mensalidade, rateio por jogo ou cobrança avulsa: veja como organizar o caixa do baba, definir regras claras e usar Pix sem constrangimento.",
    published: "2026-10-12",
    updated: "2026-10-12",
    intro:
      "Falar de dinheiro é o momento mais desconfortável de qualquer grupo de amigos. Com regras claras e um registro simples, a cobrança do baba deixa de ser um problema. Veja como estruturar.",
    sections: [
      {
        h2: "Mensalidade ou rateio por jogo?",
        p: [
          "Na mensalidade, cada jogador paga um valor fixo por mês, independentemente de quantas vezes foi. É mais simples de controlar e dá previsibilidade para pagar a quadra, mas pode parecer injusta para quem falta bastante.",
          "No rateio por jogo, o custo da quadra é dividido entre quem realmente jogou naquele dia. É mais justo, porém exige que alguém faça a conta todas as semanas. Muitos grupos misturam os dois: mensalidade para os fixos e valor avulso para os convidados.",
        ],
      },
      {
        h2: "Como calcular o valor",
        p: [
          "Some os custos fixos do mês, como aluguel da quadra, bola, colete e água, e divida pelo número de jogadores fixos. Se o rateio for por jogo, divida o valor da quadra pela quantidade de pessoas presentes. Arredonde para cima de forma transparente e guarde a sobra em caixa para imprevistos.",
        ],
      },
      {
        h2: "Deixe a regra por escrito",
        ul: [
          "Valor e data de vencimento.",
          "Chave Pix única para todos os pagamentos.",
          "O que acontece com quem atrasa (por exemplo, fica na reserva até regularizar).",
          "Como os convidados avulsos pagam.",
        ],
      },
      {
        h2: "Use Pix e comprovante",
        p: [
          "O Pix resolveu boa parte do problema, mas ainda é preciso conferir quem pagou. Peça o comprovante ou use uma cobrança com QR code, de forma que cada pagamento fique associado a um jogador e a um período.",
        ],
      },
      {
        h2: "Transparência: um caixa que todos podem ver",
        p: [
          "O que gera desconfiança é a falta de informação. Mostre quanto foi arrecadado, quanto foi gasto e o saldo atual. Quando o grupo vê as contas, ninguém precisa pedir explicações, e o organizador fica protegido de insinuações.",
        ],
      },
      {
        h2: "Como o Draft Play ajuda",
        media: [
          {
            src: "/marketing/app-caixa.webp",
            alt: "Tela financeira do Draft Play com o valor arrecadado, as despesas e o saldo do caixa do baba",
            caption: "Arrecadado, despesas e saldo, com botões para nova cobrança e nova despesa.",
            width: 540,
            height: 897,
          },
        ],
        p: [
          "O Draft Play tem uma tela financeira com caixa do baba, valor arrecadado, despesas e saldo atual, além de cobranças via Pix com QR code dentro do app. Assim, mensalidade e rateio ficam no mesmo lugar da lista de presença.",
        ],
      },
    ],
  },

  {
    slug: "regras-de-goleiro-e-reserva-no-baba",
    title: "Regras de goleiro e reserva no baba: como combinar para não ter discussão",
    description:
      "Goleiro fixo ou rotativo? Quem entra quando alguém falta? Veja os modelos mais usados e como escolher o que funciona para o seu grupo.",
    published: "2026-10-12",
    updated: "2026-10-12",
    intro:
      "Goleiro e reserva são os dois assuntos que mais geram discussão em baba. A saída é combinar as regras antes da bola rolar. Veja os modelos mais comuns.",
    sections: [
      {
        h2: "O goleiro fixo por time",
        p: [
          "Cada time tem o seu goleiro durante todo o dia. É o modelo mais simples e funciona bem quando há pelo menos tantos goleiros quanto times. O risco é desequilibrar: se um time tem um goleiro muito bom e o outro não, o resultado já nasce torto.",
        ],
      },
      {
        h2: "O rodízio de goleiro",
        p: [
          "Todo mundo joga no gol por um período. É o mais justo quando ninguém quer ficar fixo na posição, e vale em babas informais. A desvantagem é a qualidade irregular do gol, o que pode deixar os jogos menos disputados.",
        ],
      },
      {
        h2: "Goleiro na fila da quadra",
        p: [
          "Em quadras com muitos times, os goleiros ficam numa fila própria e entram quando o time joga. Assim, quem é goleiro de verdade joga mais, e os times de linha ficam sempre completos. É um bom modelo quando há mais times do que goleiros fixos.",
        ],
      },
      {
        h2: "Como funciona a reserva",
        p: [
          "A reserva é o conjunto de jogadores confirmados que sobraram depois de formar os times. A regra mais aceita é entrar na ordem de confirmação: o primeiro da fila substitui quem faltou, atrasou ou se machucou.",
          "Quando o baba tem mais de dois times, o reserva também pode servir de coringa e completar o time que ficou com um a menos, desde que isso seja combinado e transparente.",
        ],
      },
      {
        h2: "Como decidir qual regra usar",
        ul: [
          "Conte quantos goleiros fixos o grupo tem em média.",
          "Veja quantos times jogam por dia e se todos têm goleiro.",
          "Pergunte ao grupo qual formato incomoda menos e teste por quatro semanas.",
          "Registre a regra no grupo para evitar mudanças no meio do jogo.",
        ],
      },
      {
        h2: "Como o Draft Play lida com isso",
        media: [
          {
            src: "/marketing/app-visitante.webp",
            alt: "Modo Visitante do Draft Play com os campos de jogadores por time, reserva e nível de cada jogador",
            caption: "No Modo Visitante dá para testar o sorteio com reserva sem criar conta.",
            width: 540,
            height: 897,
          },
        ],
        p: [
          "No Draft Play, o presidente escolhe o modo de goleiro: fixo no time ou fila própria da quadra. Se houver goleiros suficientes para todos os times, cada um recebe o seu. Se não, os goleiros vão para a fila. A reserva também é montada automaticamente, e há troca de goleiro durante a partida.",
        ],
      },
    ],
  },

  {
    slug: "como-resolver-empate-no-baba",
    title: "Como resolver empate no baba: critérios de desempate que o grupo aceita",
    description:
      "Par ou ímpar, pênaltis, quem está há mais tempo em quadra: veja critérios de desempate simples e justos para as partidas do baba.",
    published: "2026-10-12",
    updated: "2026-10-12",
    intro:
      "Partida curta, vários times e a quadra para o próximo grupo: um empate no baba precisa de resposta rápida. Estes são os critérios mais usados, e como escolher um antes do jogo.",
    sections: [
      {
        h2: "Por que o empate é um problema no baba",
        p: [
          "Em torneio, o regulamento define o desempate. No baba, o tempo é curto e muita gente está esperando para entrar. Sem regra combinada, o empate vira discussão sobre quem merece continuar, e o jogo seguinte atrasa.",
        ],
      },
      {
        h2: "Os critérios mais usados",
        ul: [
          "Par ou ímpar entre os times: é rápido e ninguém discute, mas depende de sorte.",
          "Saem os dois times: o empate é considerado derrota para ambos e entram dois novos. Estimula quem está na fila, mas cansa quem jogou bem.",
          "Sai quem ganhou na partida anterior: premia o desempenho, mas pode afastar o time mais forte da quadra.",
          "Pênaltis ou cobranças alternadas: dá emoção, mas leva tempo.",
          "Gol de ouro: o próximo gol decide. Vale se houver tempo extra.",
        ],
      },
      {
        h2: "Como escolher",
        p: [
          "Pense no tempo da quadra e no tamanho do grupo. Se há muita gente esperando, escolha critérios rápidos como par ou ímpar. Se o grupo é pequeno e todos jogam o dia inteiro, vale o gol de ouro ou os pênaltis.",
          "Qualquer que seja o critério, o importante é que seja o mesmo em todos os jogos do dia e conhecido de todos.",
        ],
      },
      {
        h2: "Empate com mais de dois times",
        p: [
          "Quando três ou mais times disputam o mesmo dia, o empate não afeta só quem jogou: ele muda a ordem da fila. Defina de antemão se o time que empatou volta ao fim da fila ou se mantém a vaga. Isso evita que o mesmo time monopolize a quadra.",
        ],
      },
      {
        h2: "Como o Draft Play resolve",
        media: [
          {
            src: "/marketing/placar-ao-vivo-guia.webp",
            alt: "Partida ao vivo no Draft Play com cronômetro, placar dos dois times e a fila dos próximos a jogar",
            caption: "Cronômetro, placar e fila de próximos times na mesma tela.",
          },
        ],
        p: [
          "No Draft Play, o empate pausa o cronômetro e abre o desempate por par ou ímpar entre os dois times envolvidos, sem alterar o restante da fila. O resultado fica registrado na partida.",
        ],
      },
    ],
  },

  {
    slug: "como-montar-ranking-de-gols-e-assistencias-do-baba",
    title: "Como montar um ranking de gols e assistências do baba",
    description:
      "Por que registrar gols, assistências e cartões muda o clima do baba, o que contar e como manter um ranking justo ao longo da temporada.",
    published: "2026-10-12",
    updated: "2026-10-12",
    intro:
      "'Mas eu fiz dois!' é a frase mais ouvida depois de uma partida. Um ranking registrado resolve a discussão e dá ao grupo uma razão extra para aparecer toda semana. Veja como montar um que funcione.",
    sections: [
      {
        h2: "Por que vale a pena registrar",
        p: [
          "Estatística transforma uma pelada em temporada. O artilheiro tem uma meta, o garçom ganha reconhecimento e o jogador que melhorou pode provar isso. O ranking também acaba com a memória seletiva de cada um.",
        ],
      },
      {
        h2: "O que registrar",
        ul: [
          "Gols: o básico de qualquer ranking.",
          "Assistências: valorizam quem constrói o jogo, e não só quem finaliza.",
          "Cartões: amarelo e vermelho alimentam um ranking de fair-play.",
          "Presenças: mostram quem é fiel ao grupo.",
          "Vitórias: ajudam a calcular o aproveitamento.",
        ],
      },
      {
        h2: "Quem registra?",
        p: [
          "A tarefa precisa ser de uma pessoa só por partida, de preferência quem não está jogando, ou o coordenador do dia. Se cada um anota o próprio gol, o ranking perde a credibilidade. Registre durante o jogo e não depois: a memória atrapalha.",
        ],
      },
      {
        h2: "Rankings além do artilheiro",
        p: [
          "Um único ranking favorece sempre os mesmos atacantes. Crie categorias: artilheiro, líder de assistências, melhor do mês, fair-play e MVP do dia, escolhido por votação do grupo. Assim, mais gente tem chance de aparecer no topo.",
        ],
      },
      {
        h2: "Convidados e o ranking",
        p: [
          "Convidados avulsos podem marcar gol, mas não devem entrar no ranking do grupo. Registre o que aconteceu no histórico da partida, e mantenha o ranking só com quem faz parte do baba.",
        ],
      },
      {
        h2: "Como o Draft Play ajuda",
        media: [
          {
            src: "/marketing/app-rankings.webp",
            alt: "Rankings do Draft Play com abas de gols, assistências, MVP, mês e fair-play e o pódio dos três primeiros",
            caption: "Rankings por gols, assistências, MVP, mês e fair-play.",
            width: 540,
            height: 897,
          },
          {
            src: "/marketing/app-perfil.webp",
            alt: "Perfil de jogador no Draft Play com estatísticas, conquistas e botão para copiar o link público",
            caption: "Cada jogador tem um perfil com estatísticas e conquistas.",
            width: 540,
            height: 897,
          },
          {
            src: "/marketing/app-comparacao.webp",
            alt: "Comparação entre dois jogadores no Draft Play, com gols, assistências e vitórias lado a lado",
            caption: "Comparação 1v1: dois jogadores lado a lado.",
            width: 540,
            height: 897,
          },
        ],
        p: [
          "O Draft Play registra gols, assistências e cartões durante a partida e alimenta rankings por gols, assistências, MVP, mês e fair-play. Cada jogador tem um perfil com conquistas, divisões de Ferro a Diamante e um link público opcional para compartilhar.",
        ],
      },
    ],
  },
];

export const getGuia = (slug) => GUIAS.find((g) => g.slug === slug) || null;
