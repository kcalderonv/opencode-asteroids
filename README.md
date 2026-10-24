# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye tres power-ups (**Velocidad**, **Escudo** y **Triple disparo**) que aparecen al destruir asteroides, skins de nave seleccionables, y una **estrella fugaz** que cruza el campo a gran velocidad y se desvanece sola.

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
| Morada  | morado       | doble tamaño y doble puntuación |

La mayoría de las skins son **sólo cosméticas**: la hitbox no cambia. La **Morada** es la excepción: se dibuja al doble de escala, su hitbox y su burbuja de escudo también son el doble de grandes, y todos los puntos que consigues con ella se multiplican por 2 (el HUD lo indica con `x2`). Mientras el power-up de Velocidad o el de Triple disparo están activos, la nave se dibuja en verde lima o cian respectivamente para no perder el feedback.

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |

Con la skin **Morada** todos los puntos (asteroides y estrella fugaz) se duplican.

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- Power-ups de Velocidad (rombo verde lima), Escudo (hexágono azul) y Triple disparo (triángulo cian)
- Estrella fugaz: asteroide veloz y esporádico que se desvanece solo

## Estrella fugaz

- Aparece por un borde aleatorio cada 12-20 s y cruza la pantalla a ~200 px/s.
- Vale 150 puntos, **no se parte** al ser destruida y deja un rastro brillante.
- Se desvanece a los 8 s (parpadea en los últimos 2 s) con una pequeña explosión.
- No bloquea el avance de nivel.

## Power-ups

| Power-up       | Efecto                                                    | Duración |
| -------------- | --------------------------------------------------------- | -------- |
| Velocidad      | Duplica el empuje de la nave                              | 5 s      |
| Escudo         | La nave destruye los asteroides que la golpean sin daño    | 8 s      |
| Triple disparo | Dispara tres balas paralelas en cada disparo              | 5 s      |

- Aparece con ~20% de probabilidad al destruir cualquier asteroide, con el tipo sorteado a partes iguales (1/3 cada uno).
- Permanece en el campo 10 s antes de desvanecerse (parpadea al final).
- Mientras está activo, el HUD muestra el tiempo restante de cada efecto apilado, y la nave cambia de color: verde lima con Velocidad, cian con Triple disparo.
- El Escudo dibuja una burbuja azul alrededor de la nave con un arco que marca el tiempo que le queda; no se consume al recibir un impacto, sólo caduca.
- Recoger otro power-up del mismo tipo durante el efecto reinicia su contador.
