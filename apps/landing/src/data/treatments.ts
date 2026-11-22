type Treatment = {
  slug: string;
  title: string;
  tag: string;
  duration: string;
  imageSrc: string;
  description: string;
  bestFor: string;
  benefits: string[];
  ritual: string;
  feature?: {
    badge: string;
    origin: "Italy";
    deviceImageSrc: string;
    videoSrc: string;
    videoPoster: string;
    sourceUrl: string;
  };
};

const facialTreatments: Treatment[] = [
  {
    slug: "micro-lifting",
    title: "Micro Lifting",
    tag: "Lifting no invasivo",
    duration: "Según valoración",
    imageSrc: "/images/keysar-cosmetics/real-micro-lifting.jpeg",
    description:
      "Micro Lifting con NeuroNova: tecnología estética italiana patentada que combina flujo de iones, microcorrientes y vehiculación transdérmica para un lifting facial no invasivo.",
    bestFor: "Piel con flacidez ligera, líneas visibles o pérdida de firmeza.",
    benefits: ["Estimula colágeno", "Tensa la piel", "Suaviza signos de edad"],
    ritual:
      "NeuroNova combina flujo de iones, microcorrientes y vehiculación transdérmica en un protocolo facial para trabajar firmeza, textura y luminosidad sin cirugía.",
    feature: {
      badge: "Best Seller 2026",
      origin: "Italy",
      deviceImageSrc: "/images/keysar-cosmetics/neuro-nova-device.png",
      videoSrc: "/videos/neuro-nova-demo.mp4",
      videoPoster: "/images/keysar-cosmetics/neuro-nova-demo-poster.webp",
      sourceUrl: "https://novalismed.com/es/equipos/neuro-nova",
    },
  },
  {
    slug: "limpieza-facial-profunda",
    title: "Limpieza Facial Profunda",
    tag: "Purificación",
    duration: "60 min",
    imageSrc: "/images/keysar-cosmetics/real-limpieza-facial.jpeg",
    description:
      "Tratamiento de belleza diseñado para eliminar impurezas y mejorar la apariencia y salud de la piel.",
    bestFor:
      "Piel con poros congestionados, textura irregular o exceso de impurezas.",
    benefits: ["Limpia profundamente", "Mejora apariencia", "Prepara la piel"],
    ritual:
      "Se realiza mediante varios pasos y productos especializados para lograr una limpieza profunda y dejar la piel más fresca y equilibrada.",
  },
  {
    slug: "peel-off",
    title: "Peel Off",
    tag: "Luminosidad",
    duration: "45-60 min",
    imageSrc: "/images/keysar-cosmetics/facial3.png",
    description:
      "Mascarilla facial que ayuda a dar luminosidad y reafirmar líneas de expresión con calcio, silicio y magnesio.",
    bestFor: "Piel apagada, cansada o con primeras líneas de expresión.",
    benefits: ["Aporta luminosidad", "Reafirma", "Nutre con minerales"],
    ritual:
      "Un ritual de mascarilla peel off que renueva visualmente el rostro y deja una sensación tersa, fresca y luminosa.",
  },
  {
    slug: "peel-off-vitamin-c",
    title: "Peel Off Vitamin C",
    tag: "Vitamina C",
    duration: "45-60 min",
    imageSrc: "/images/keysar-cosmetics/facial4.png",
    description:
      "Mascarilla peel off con vitamina C y ácido hialurónico que ilumina, unifica el tono e hidrata el rostro.",
    bestFor: "Piel cansada, tono desigual o falta de hidratación.",
    benefits: ["Unifica tono", "Brinda elasticidad", "Suaviza líneas"],
    ritual:
      "Combina luminosidad antioxidante e hidratación para mejorar el aspecto de la piel cansada y aportar un acabado más radiante.",
  },
  {
    slug: "peel-off-aloe-vera",
    title: "Peel Off Aloe Vera",
    tag: "Calma",
    duration: "45-60 min",
    imageSrc: "/images/keysar-cosmetics/facial5.png",
    description:
      "Mascarilla con aloe vera diseñada para pieles sensibles o con rosácea, con efecto calmante, hidratante y antioxidante.",
    bestFor: "Piel sensible, inflamada, reactiva o con tendencia a rosácea.",
    benefits: ["Desinflama", "Hidrata", "Ayuda contra radicales libres"],
    ritual:
      "Un cuidado suave que busca calmar la piel, aportar hidratación y ayudar a mantener una apariencia joven y confortable.",
  },
  {
    slug: "24k-golden-glow",
    title: "24K Golden Glow",
    tag: "Oro 24K",
    duration: "60 min",
    imageSrc: "/images/keysar-cosmetics/facial6.png",
    description:
      "Tratamiento con propiedades antiinflamatorias y antioxidantes que hidrata, nutre y ayuda a mejorar la circulación.",
    bestFor: "Piel apagada, deshidratada o que busca un glow visible.",
    benefits: ["Hidrata", "Nutre", "Aporta luminosidad"],
    ritual:
      "Un ritual premium que ayuda a reparar visualmente la piel, estimular la circulación sanguínea y dejar un acabado radiante.",
  },
  {
    slug: "hilos-tensores",
    title: "Hilos Tensores",
    tag: "Efecto lifting",
    duration: "Según valoración",
    imageSrc: "/images/keysar-cosmetics/facial7.png",
    description:
      "Ayudan a reafirmar la piel, aumentar la producción natural de colágeno y lograr un efecto lifting rejuvenecedor sin cirugía.",
    bestFor:
      "Flacidez, surcos, líneas de expresión y contornos con poca definición.",
    benefits: ["Reafirma", "Estimula colágeno", "Resultados progresivos"],
    ritual:
      "Tratamiento progresivo con resultados visibles al momento y mejora gradual con el paso de los meses.",
  },
  {
    slug: "oxycura",
    title: "Oxycura",
    tag: "Oxígeno",
    duration: "50 min",
    imageSrc: "/images/keysar-cosmetics/facial8.png",
    description:
      "Tratamiento de oxígeno con poderosa actividad antioxidante e hidratación profunda para una piel más radiante.",
    bestFor: "Piel cansada, deshidratada o con falta de luminosidad.",
    benefits: ["Hidrata profundamente", "Aporta brillo", "Acción antioxidante"],
    ritual:
      "Oxigenación intensiva para ayudar a que la piel se vea más luminosa, fresca y revitalizada.",
  },
  {
    slug: "facial-hidratante-24k",
    title: "Facial Hidratante 24K",
    tag: "Hidratación",
    duration: "60 min",
    imageSrc: "/images/keysar-cosmetics/facial9.png",
    description:
      "Hidratación profunda con polvo de oro 24K que ayuda a desintoxicar, desinflamar y refrescar el rostro.",
    bestFor: "Piel seca, deshidratada, sensible o con rosácea.",
    benefits: ["Hidratación profunda", "Desintoxica", "Apariencia fresca"],
    ritual:
      "Gracias a su concentración de agua y humectantes, la piel absorbe humedad rápidamente y luce más radiante.",
  },
  {
    slug: "facial-anti-acne",
    title: "Facial Anti Acné",
    tag: "Control",
    duration: "50-60 min",
    imageSrc: "/images/keysar-cosmetics/facial10.png",
    description:
      "Limpia profundamente, elimina impurezas y células muertas, combate bacterias causantes del acné y reduce inflamación.",
    bestFor: "Piel con brotes, textura irregular o tendencia acneica.",
    benefits: ["Previene brotes", "Mejora textura", "Equilibra hidratación"],
    ritual:
      "Un protocolo de limpieza y equilibrio que ayuda a mantener la piel más limpia, calmada e hidratada.",
  },
  {
    slug: "neck-and-chest",
    title: "Neck and Chest",
    tag: "Cuello y escote",
    duration: "45 min",
    imageSrc: "/images/keysar-cosmetics/facial11.png",
    description:
      "Tratamiento especializado para rejuvenecer, hidratar y revitalizar la delicada piel del pecho y escote.",
    bestFor:
      "Cuello y escote con resequedad, líneas finas, tono desigual o exposición solar.",
    benefits: ["Hidratación intensa", "Mejora firmeza", "Aporta luminosidad"],
    ritual:
      "Utiliza una mascarilla de hidrogel rica en activos hidratantes, antioxidantes y reafirmantes para una absorción profunda.",
  },
  {
    slug: "cabina-doble-vip",
    title: "Cabina Doble VIP",
    tag: "Experiencia compartida",
    duration: "Según ritual",
    imageSrc: "/images/keysar-cosmetics/real-cabina-doble.png",
    description:
      "Experiencia para compartir con tu persona favorita en un ambiente fresco y tranquilo.",
    bestFor:
      "Parejas, amigas o quienes desean combinar facial y masaje corporal.",
    benefits: ["Ambiente privado", "Ritual compartido", "Facial y masaje"],
    ritual:
      "Puedes combinar un tratamiento facial con un exquisito masaje corporal para vivir una experiencia doble y personalizada.",
  },
  {
    slug: "eye-ritual",
    title: "Eye Ritual",
    tag: "Mirada",
    duration: "45-50 min",
    imageSrc: "/images/keysar-cosmetics/facial13.png",
    description:
      "Ritual de alta cosmética para revitalizar la delicada zona del contorno de ojos y combatir signos de fatiga.",
    bestFor: "Mirada cansada, líneas finas, signos de fatiga o envejecimiento.",
    benefits: ["Revitaliza", "Combate fatiga", "Cuida el contorno"],
    ritual:
      "Tratamiento meticulosamente formulado con activos de vanguardia para una mirada renovada.",
  },
];

const bodyTreatments: Treatment[] = [
  {
    slug: "masaje-relajante",
    title: "Masaje Relajante",
    tag: "Calma",
    duration: "50-60 min",
    imageSrc: "/images/keysar-cosmetics/masaje1.png",
    description:
      "Reduce el estrés y la ansiedad, mejora la circulación, disminuye dolores musculares y favorece la calidad del sueño.",
    bestFor: "Estrés, ansiedad, cansancio o tensión muscular ligera.",
    benefits: ["Reduce estrés", "Mejora circulación", "Favorece descanso"],
    ritual:
      "Movimientos relajantes de ritmo envolvente para bajar la tensión, liberar carga física y recuperar calma.",
  },
  {
    slug: "masaje-reductivo",
    title: "Masaje Reductivo",
    tag: "Silueta",
    duration: "60 min",
    imageSrc: "/images/keysar-cosmetics/masaje2.png",
    description:
      "Masaje de presión fuerte y velocidad rápida enfocado en grasa localizada y mejora visual de la silueta.",
    bestFor: "Zonas específicas como abdomen, caderas, muslos o glúteos.",
    benefits: ["Trabaja grasa localizada", "Define silueta", "Activa tejido"],
    ritual:
      "Se realiza con maniobras intensas para estimular zonas localizadas y apoyar una figura más estética.",
  },
  {
    slug: "reflexologia",
    title: "Reflexología",
    tag: "Puntos reflejos",
    duration: "40-50 min",
    imageSrc: "/images/keysar-cosmetics/masaje3.png",
    description:
      "Tratamiento relajante que favorece la circulación, reduce el estrés y ayuda a equilibrar diferentes sistemas del cuerpo.",
    bestFor: "Estrés, cansancio, tensión o búsqueda de equilibrio corporal.",
    benefits: ["Libera toxinas", "Disminuye dolor", "Revitaliza energía"],
    ritual:
      "Se trabaja mediante masaje en puntos reflejos de manos o pies para inducir bienestar y relajación.",
  },
  {
    slug: "masaje-descontracturante",
    title: "Masaje Descontracturante",
    tag: "Descarga muscular",
    duration: "60 min",
    imageSrc: "/images/keysar-cosmetics/masaje4.png",
    description:
      "Tratamiento manual enfocado en liberar contracturas, dolor, rigidez y limitación de movimiento.",
    bestFor:
      "Contracturas profundas en espalda, cuello, hombros o zonas con tensión acumulada.",
    benefits: ["Deshace nudos", "Restaura elasticidad", "Alivia tensión"],
    ritual:
      "Aplica presión controlada, amasamientos, fricciones y estiramientos para restaurar el estado natural del músculo.",
  },
  {
    slug: "piernas-cansadas",
    title: "Piernas Cansadas",
    tag: "Ligereza",
    duration: "45-50 min",
    imageSrc: "/images/keysar-cosmetics/piernas-cansadas-keysar.png",
    description:
      "Masaje beneficioso para aliviar tensión y fatiga muscular, estimular circulación y reducir hinchazón.",
    bestFor:
      "Piernas pesadas, inflamadas, fatigadas o después de jornadas largas.",
    benefits: ["Reduce hinchazón", "Alivia dolor", "Mejora flexibilidad"],
    ritual:
      "Se aplica presión en puntos adecuados para recuperar comodidad, ligereza y movilidad en las piernas.",
  },
  {
    slug: "presoterapia",
    title: "Presoterapia",
    tag: "Bienestar de piernas",
    duration: "Según valoración",
    imageSrc: "/images/keysar-cosmetics/presoterapia.png",
    description:
      "Tratamiento con botas de compresión neumática que alternan presión y descanso para brindar una sensación de ligereza en las piernas.",
    bestFor:
      "Piernas cansadas o con sensación de pesadez después de jornadas largas.",
    benefits: ["Aporta ligereza", "Favorece el descanso", "Relaja las piernas"],
    ritual:
      "En una sesión personalizada, las botas aplican ciclos suaves de compresión y liberación mientras disfrutas de un momento de descanso.",
  },
  {
    slug: "body-vip",
    title: "Body VIP",
    tag: "Firma Keysar",
    duration: "90 min",
    imageSrc: "/images/keysar-cosmetics/masaje6.png",
    description:
      "Terapia integral con maniobras de presión ligera a media, aceites esenciales y domo de luz LED.",
    bestFor:
      "Quien busca relajación neuromuscular profunda y una experiencia corporal premium.",
    benefits: [
      "Relaja músculos",
      "Estimula colágeno",
      "Equilibra sistema nervioso",
    ],
    ritual:
      "Combina presión manual, aromaterapia y luz LED para inducir relajación y estimular procesos de bienestar corporal.",
  },
];

export const treatmentGroups = [
  {
    key: "faciales",
    label: "Faciales",
    introduction: "Compara los faciales de Keysar Cosmetics en Ciudad de México por duración, técnica y necesidades de tu piel.",
    ariaLabel: "tratamientos faciales",
    imageSrc: "/images/treatment-facial.png",
    imageAltPrefix: "Tratamiento",
    treatments: facialTreatments,
  },
  {
    key: "corporales",
    label: "Corporales",
    introduction: "Explora los masajes y tratamientos corporales de Keysar Cosmetics en Ciudad de México, desde un masaje relajante hasta presoterapia.",
    ariaLabel: "tratamientos corporales",
    imageSrc: "/images/body-massage.png",
    imageAltPrefix: "Tratamiento corporal",
    treatments: bodyTreatments,
  },
];
