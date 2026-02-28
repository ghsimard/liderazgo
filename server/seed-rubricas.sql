-- Seed rubrica_modules and rubrica_items for Render PostgreSQL
-- Run this on your Render database: psql $DATABASE_URL -f server/seed-rubricas.sql

INSERT INTO rubrica_modules (id, module_number, title, objective, sort_order) VALUES
('a1c75edd-d456-440f-9982-e04138a3aba3', 1, 'El valor de ser y de ser con otros', 'Desarrollar el autoconocimiento para interactuar con los demás miembros de la IE desde un enfoque apreciativo.', 1),
('dea2bed7-5b5d-4249-b98b-a79eb5ae3b65', 2, 'La reconquista pedagógica', 'Construir una visión compartida de la IE con la comunidad educativa incorporando prácticas pedagógicas de inclusión y equidad, a partir del uso de herramientas de comunicación asertiva.', 2),
('6445a4d6-bee8-487d-8315-a561c9bf4236', 3, 'Potenciando tesoros', 'Revisar con su equipo de trabajo el PEI en conexión con la visión compartida, aplicando herramientas de trabajo colaborativo.', 3),
('dec4e10a-c1b0-4ce6-bb15-04f26f3764ee', 4, 'Tejiendo puentes', 'Establecer un plan de acciones en conexión con la revisión del PEI, basado en los resultados de la evaluación de la IE (interna, externa e institucional) y apoyado en redes con pares.', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rubrica_items (id, module_id, item_type, item_label, sort_order, desc_avanzado, desc_intermedio, desc_basico, desc_sin_evidencia) VALUES
-- Module 1: El valor de ser y de ser con otros
('6b03bfc9-e6b3-48c5-882b-84617f947770', 'a1c75edd-d456-440f-9982-e04138a3aba3', 'PROCESO', 'Autoconocimiento', 1,
 'Reconoce de manera visible y constante sus fortalezas, avances y oportunidades de mejora a través de reflexiones profundas sobre quién es como líder: qué valora, cuáles son sus emociones, cómo impactan su liderazgo y cuáles son las creencias que tiene (limitantes y expansivas).',
 'Reconoce frecuentemente sus fortalezas, avances y oportunidades de mejora a través de reflexiones sobre quién es como líder.',
 'Algunas veces reconoce sus fortalezas o sus oportunidades de mejora.',
 'Aún no reconoce sus fortalezas ni sus oportunidades de mejora.'),

('af9cb4bf-f112-464f-bcd9-d6ee328663d4', 'a1c75edd-d456-440f-9982-e04138a3aba3', 'PROCESO', 'Enfoque apreciativo', 2,
 'Reconoce constantemente la importancia de resaltar la potencia de su equipo de trabajo (coordinadores, docentes, orientadores y administrativos), y tiene en cuenta la influencia del contexto.',
 'Reconoce con frecuencia la importancia de ver la potencia de su equipo de trabajo.',
 'Algunas veces reconoce la importancia de ver la potencia de su equipo de trabajo.',
 'Aún no reconoce la importancia de ver la potencia de su equipo de trabajo.'),

('b1347855-7cf3-461a-8e5c-d1c3857e30d6', 'a1c75edd-d456-440f-9982-e04138a3aba3', 'PRODUCTO', 'Propósito de vida', 3,
 'Construye un propósito de vida que le da sentido a su labor como líder educativo, conectado con su autoconocimiento y enfoque apreciativo.',
 'Construye un propósito de vida y está en proceso de conectarlo con su labor como líder educativo.',
 'Construye un propósito de vida, sin conexión con su labor como líder educativo.',
 'Aún no logra construir un propósito de vida.'),

-- Module 2: La reconquista pedagógica
('ca23ce11-2d34-4a68-b3e2-efe832420c12', 'dea2bed7-5b5d-4249-b98b-a79eb5ae3b65', 'PROCESO', 'Comunicación asertiva', 1,
 'Constantemente tiene conversaciones con todo su equipo de trabajo donde es posible expresarse con confianza y seguridad, y está presente la escucha para comprender al otro.',
 'Frecuentemente tiene conversaciones con su equipo de trabajo donde es posible expresarse con confianza y seguridad, e intenta escuchar para comprender al otro.',
 'A veces tiene conversaciones con algunos integrantes de su equipo de trabajo donde es posible expresarse con confianza y seguridad, e intenta escuchar para comprender al otro.',
 'Aún no crea un ambiente de confianza y seguridad para tener conversaciones con su equipo de trabajo.'),

('44757507-3302-480c-900e-92e83058bfbb', 'dea2bed7-5b5d-4249-b98b-a79eb5ae3b65', 'PROCESO', 'Participación de la comunidad', 2,
 'Genera y garantiza la participación decisoria de los actores de la comunidad educativa.',
 'Genera espacios de participación consultiva con la comunidad educativa.',
 'Genera espacios de participación informativa con los actores de la comunidad educativa.',
 'Aún no genera espacios de participación con los actores de la comunidad educativa.'),

('d4b72d6e-432c-42c3-b009-c3513b3fe594', 'dea2bed7-5b5d-4249-b98b-a79eb5ae3b65', 'PRODUCTO', 'Visión compartida con prácticas de equidad para una escuela inclusiva', 3,
 'Construye con la comunidad una visión de la institución educativa que incluye prácticas de equidad para una escuela inclusiva.',
 'Construye con su equipo de trabajo una visión de la institución educativa que incluye prácticas de equidad para una escuela inclusiva.',
 'Construye con su equipo de trabajo una visión de la institución educativa sin incluir prácticas de equidad para una escuela inclusiva.',
 'Aún no construye con otros la visión de la institución educativa.'),

-- Module 3: Potenciando tesoros
('3deec7e7-d4bf-43c2-9140-7f19dad187ef', '6445a4d6-bee8-487d-8315-a561c9bf4236', 'PROCESO', 'Trabajo colaborativo', 1,
 'Implementa con efectividad los principios y las herramientas de trabajo colaborativo en espacios de participación con la comunidad educativa.',
 'Implementa los principios y herramientas del trabajo colaborativo con sus equipos de trabajo.',
 'Implementa los principios del trabajo colaborativo con algunos de sus equipos de trabajo.',
 'Aún no implementa los principios y herramientas del trabajo colaborativo.'),

('cf4a99ff-2261-44a6-bf7b-9d5357ba7018', '6445a4d6-bee8-487d-8315-a561c9bf4236', 'PROCESO', 'Revisión del PEI en relación con la visión compartida que incluye prácticas de equidad para una escuela inclusiva', 2,
 'Revisa el PEI con la comunidad educativa a la luz de la visión compartida incluyendo prácticas de equidad para una escuela inclusiva.',
 'Revisa el PEI con sus equipos de trabajo a la luz de la visión compartida incluyendo prácticas de equidad para una escuela inclusiva.',
 'Revisa con algunos de sus equipos de trabajo la pertinencia del PEI sin considerar su relación con la visión compartida y sin incluir prácticas de equidad para una escuela inclusiva.',
 'Aún no revisa la relación entre el PEI y la visión compartida que incluya prácticas de equidad para una escuela inclusiva.'),

('92d9638a-4556-409d-a1d3-5d7f2138fcce', '6445a4d6-bee8-487d-8315-a561c9bf4236', 'PRODUCTO', 'Consolidado que recoge las prácticas de equidad e inclusión identificadas en el PEI o propuestas para su actualización', 3,
 'Consolidado que recoge las prácticas de equidad e inclusión identificadas en el PEI o propuestas para su actualización, elaborado con la participación de la comunidad educativa.',
 'Consolidado que recoge las prácticas de equidad e inclusión identificadas en el PEI o propuestas para su actualización, elaborado con la participación de los equipos de trabajo.',
 'Consolidado que recoge las prácticas de equidad e inclusión identificadas en el PEI o propuestas para su actualización, elaborado con la participación de algunos miembros del equipo de trabajo.',
 'Aún no consolida las prácticas de equidad e inclusión identificadas en el PEI.'),

-- Module 4: Tejiendo puentes
('d3f4907d-0637-4b30-99ab-4f0c574d34aa', 'dec4e10a-c1b0-4ce6-bb15-04f26f3764ee', 'PROCESO', 'Planeación participativa basada en la revisión del PEI y en el trabajo en red', 1,
 'Planea con la comunidad educativa incluyéndola en la toma de decisiones para la construcción del plan de acciones basado en la revisión del PEI y el trabajo en red.',
 'Planea y toma decisiones con sus equipos de trabajo para la construcción del plan de acciones basado en la revisión del PEI y el trabajo en red.',
 'Planea con la comunidad educativa consultándola para la construcción del plan de acciones basado en la revisión del PEI y el trabajo en red.',
 'Aún no genera espacios de participación de la comunidad educativa en los procesos de planeación a partir de la revisión del PEI y el trabajo en red.'),

('2fe84315-e5fa-459d-98da-a329c52fed18', 'dec4e10a-c1b0-4ce6-bb15-04f26f3764ee', 'PRODUCTO', 'Plan de acción basado en la evaluación institucional', 2,
 'Construye un plan de acciones completo que incluye: objetivo, metas, indicadores, actividades, responsables, tiempos y relación con el PMI, basado en los procesos de evaluación de la IE.',
 'Construye un plan de acciones que incluye: objetivo, actividades, responsables, tiempos y relación con el PMI, basado en los procesos de evaluación de la IE.',
 'Perfila un plan de acciones estableciendo objetivos, metas o acciones, basado en los procesos de evaluación de la IE.',
 'Aún no perfila un plan de acciones, basado en los procesos de la evaluación de la institución.')
ON CONFLICT (id) DO NOTHING;
