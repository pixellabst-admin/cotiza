#!/usr/bin/env python3
"""Build the downloadable source ZIP without credentials, database files or build output."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
DESTINATION = ROOT / "public" / "descargas" / "cotiza-local.zip"
ROOT_FILES = (
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "drizzle.config.ts",
    "drizzle.web.config.ts",
    "PUBLICAR-WEB.md",
    "SUBIR-A-INTERNET.txt",
    "compose.yaml",
    ".gitignore",
    ".nvmrc",
    "README.md",
    "LEEME-PRIMERO.txt",
    "BASE-DE-DATOS.md",
    "INICIAR-WINDOWS.cmd",
    "iniciar-local.sh",
    "ACTUALIZAR-GITHUB.bat",
    "actualizar.sh",
    "ACTUALIZAR-EN-VERCEL.txt",
    "public/icon.svg",
)
SOURCE_DIRECTORIES = ("src", "scripts", "tests", "public/fonts")
FORBIDDEN_PARTS = {"node_modules", ".next", ".git", "artifacts", "__pycache__", "test-results", "playwright-report"}


def safe_source(file: Path) -> bool:
    if file.is_symlink() or not file.is_file():
        return False
    relative = file.relative_to(ROOT)
    if FORBIDDEN_PARTS.intersection(relative.parts):
        return False
    if any(part.startswith(".env") for part in relative.parts):
        return False
    return file.suffix.lower() not in {".zip", ".pyc", ".log", ".dump", ".sql", ".db", ".sqlite", ".pem", ".key"}


def publish_individual_downloads() -> None:
    """Keep the standalone helper downloads identical to the project files."""
    destination = ROOT / "public" / "descargas"
    destination.mkdir(parents=True, exist_ok=True)
    for name in ("ACTUALIZAR-GITHUB.bat", "actualizar.sh", "ACTUALIZAR-EN-VERCEL.txt", "scripts/revisar-antes-de-subir.mjs"):
        source = ROOT / name
        if not safe_source(source):
            raise RuntimeError(f"Missing helper file: {name}")
        (destination / Path(name).name).write_bytes(source.read_bytes())
    print("Descargas sueltas actualizadas: ACTUALIZAR-GITHUB.bat, actualizar.sh, revisar-antes-de-subir.mjs.")


def main() -> None:
    publish_individual_downloads()
    files = set()
    for name in ROOT_FILES:
        file = ROOT / name
        if not safe_source(file):
            raise RuntimeError(f"Missing required source file: {name}")
        files.add(file)
    lock = ROOT / "package-lock.json"
    if safe_source(lock):
        files.add(lock)
    for directory in SOURCE_DIRECTORIES:
        files.update(file for file in (ROOT / directory).rglob("*") if safe_source(file))

    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    temporary = DESTINATION.with_suffix(".zip.tmp")
    try:
        with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
            for file in sorted(files):
                archive.write(file, f"cotiza/{file.relative_to(ROOT).as_posix()}")
        with ZipFile(temporary) as archive:
            if archive.testzip() is not None:
                raise RuntimeError("Archive integrity verification failed")
            for name in archive.namelist():
                parts = Path(name).parts
                if FORBIDDEN_PARTS.intersection(parts) or any(part.startswith(".env") for part in parts):
                    raise RuntimeError("Private file found in archive")
        temporary.replace(DESTINATION)
    finally:
        temporary.unlink(missing_ok=True)

    print(f"Creado {DESTINATION.relative_to(ROOT)}: {len(files)} archivos, {DESTINATION.stat().st_size:,} bytes.")
    print("Sin archivos .env, contraseñas de entorno, bases de datos, node_modules ni artefactos de prueba.")


if __name__ == "__main__":
    main()
