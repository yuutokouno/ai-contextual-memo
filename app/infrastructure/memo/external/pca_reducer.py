"""PCA-based dimensionality reduction for embedding vectors."""

from sklearn.decomposition import PCA  # type: ignore[import-untyped]


def reduce_to_3d(
    embeddings: list[list[float]],
    scale: float = 20.0,
) -> list[dict[str, float]]:
    """Reduce high-dimensional embeddings to 3D coordinates using PCA.

    Args:
        embeddings: List of embedding vectors (all same dimensionality).
        scale: Max absolute value for each coordinate axis.

    Returns:
        List of {x, y, z} dicts scaled to [-scale, scale].
    """
    count = len(embeddings)
    if count == 0:
        return []

    if count == 1:
        return [{"x": 0.0, "y": 0.0, "z": 0.0}]

    n_components = min(3, count)
    pca = PCA(n_components=n_components)
    reduced = pca.fit_transform(embeddings)

    # Pad to 3 dimensions if fewer components were used
    positions: list[dict[str, float]] = []
    for row in reduced:
        coords = list(row) + [0.0] * (3 - n_components)
        pos = {
            "x": float(coords[0]),
            "y": float(coords[1]),
            "z": float(coords[2]),
        }
        positions.append(pos)

    # Scale to [-scale, scale]
    max_abs = 0.0
    for pos in positions:
        for v in pos.values():
            max_abs = max(max_abs, abs(v))

    if max_abs > 0:
        factor = scale / max_abs
        for pos in positions:
            pos["x"] *= factor
            pos["y"] *= factor
            pos["z"] *= factor

    return positions
