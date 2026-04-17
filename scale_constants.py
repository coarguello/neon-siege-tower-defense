import re

scale = 1.5

def scale_point(match):
    x = float(match.group(1)) * scale
    y = float(match.group(2)) * scale
    # If integer, use int, else float but kept clean
    xs = str(int(x)) if x.is_integer() else str(x)
    ys = str(int(y)) if y.is_integer() else str(y)
    return f"{{ x: {xs}, y: {ys} }}"

with open("src/constants.ts", "r") as f:
    content = f.read()

# Scale dimensions
content = content.replace("CANVAS_WIDTH = 800;", "CANVAS_WIDTH = 1200;")
content = content.replace("CANVAS_HEIGHT = 600;", "CANVAS_HEIGHT = 900;")

# Scale Points { x: ..., y: ... }
content = re.sub(r"\{\s*x:\s*(\d+\.?\d*),\s*y:\s*(\d+\.?\d*)\s*\}", scale_point, content)

# Scale speeds in ENEMY_STATS
def scale_speed(match):
    val = float(match.group(1)) * scale
    return f"speed: {val:.2f}".rstrip('0').rstrip('.')

content = re.sub(r"speed:\s*(\d+\.?\d*)", scale_speed, content)

# Scale ranges in TOWER_STATS
def scale_range(match):
    val = int(float(match.group(1)) * scale)
    return f"range: {val}"

content = re.sub(r"range:\s*(\d+\.?\d*)", scale_range, content)

with open("src/constants.ts", "w") as f:
    f.write(content)
