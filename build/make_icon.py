"""Рисует иконку приложения (жёлтый квадрат с лампочкой) без сторонних библиотек."""
import struct
import sys
import zlib
from pathlib import Path

S = 256
SS = 4  # сглаживание: 4x4 субпикселя
BG = (247, 181, 0)
FG = (255, 255, 255)


def rrect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def bulb(x, y):
    if (x - 128) ** 2 + (y - 106) ** 2 <= 58 ** 2:
        return True
    if 101 <= x <= 155 and 120 <= y <= 168:
        return True
    if rrect(x, y, 101, 160, 155, 176, 6):
        return True
    if rrect(x, y, 106, 184, 150, 198, 7):
        return True
    return rrect(x, y, 114, 205, 142, 216, 5)


def pixel(px, py):
    bg = fg = 0
    for sy in range(SS):
        for sx in range(SS):
            x = px + (sx + 0.5) / SS
            y = py + (sy + 0.5) / SS
            if rrect(x, y, 12, 12, 244, 244, 52):
                bg += 1
                if bulb(x, y):
                    fg += 1
    n = SS * SS
    a = bg / n
    if a == 0:
        return (0, 0, 0, 0)
    f = fg / bg
    rgb = tuple(round(BG[i] * (1 - f) + FG[i] * f) for i in range(3))
    return (*rgb, round(a * 255))


def png(width, height, rows):
    raw = b''.join(b'\x00' + bytes(r) for r in rows)

    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


def main(out_dir):
    out = Path(out_dir)
    rows = []
    for y in range(S):
        row = []
        for x in range(S):
            row.extend(pixel(x, y))
        rows.append(row)
    data = png(S, S, rows)
    (out / 'icon.png').write_bytes(data)
    ico = struct.pack('<HHH', 0, 1, 1) + struct.pack('<BBBBHHII', 0, 0, 0, 0, 1, 32, len(data), 22) + data
    (out / 'build' / 'icon.ico').write_bytes(ico)
    print('ok')


if __name__ == '__main__':
    main(sys.argv[1])
