# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye un power-up de **Velocidad** que aparece al destruir asteroides, y una **estrella fugaz** que cruza el campo a gran velocidad y se desvanece sola.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |
| `S`       | Cambiar skin de la nave |

## Skins

La apariencia de la nave se puede cambiar en cualquier momento con `S` (funciona también en la pantalla de Game Over). La elección se guarda en `localStorage` y se restaura al volver a abrir el juego.

| Skin    | Color        | Rasgo                          |
| ------- | ------------ | ------------------------------ |
| Clásica | blanco       | triángulo con muesca trasera   |
| Dardo   | cian         | flecha estrecha y alargada     |
| Delta   | ámbar        | alas en flecha invertida       |
| Aguja   | violeta      | triángulo mínimo con halo      |
| Ovni    | rosa         | platillo redondeado            |

Las skins son **sólo cosméticas**: la hitbox no cambia, y mientras el power-up de Velocidad está activo la nave se sigue dibujando en verde lima para no perder el feedback.

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- Power-up de Velocidad (rombo verde lima)
- Estrella fugaz: asteroide veloz y esporádico que se desvanece solo

## Estrella fugaz

- Aparece por un borde aleatorio cada 12-20 s y cruza la pantalla a ~200 px/s.
- Vale 150 puntos, **no se parte** al ser destruida y deja un rastro brillante.
- Se desvanece a los 8 s (parpadea en los últimos 2 s) con una pequeña explosión.
- No bloquea el avance de nivel.

## Power-ups

| Power-up  | Efecto                                       | Duración |
| --------- | -------------------------------------------- | -------- |
| Velocidad | Duplica el empuje de la nave                 | 5 s      |

- Aparece con ~20% de probabilidad al destruir cualquier asteroide.
- Permanece en el campo 10 s antes de desvanecerse (parpadea al final).
- Mientras está activo, la nave se dibuja en verde lima, deja una estela y el HUD muestra el tiempo restante.
- Recoger otro durante el efecto reinicia el contador a 5 s.
