import os
import sys
import subprocess
import uvicorn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
FRONTEND_DIST = os.path.join(FRONTEND_DIR, "dist")

def check_and_build_frontend():
    index_html = os.path.join(FRONTEND_DIST, "index.html")
    if not os.path.exists(index_html):
        print("Frontend production build not found. Building React frontend now...")
        try:
            # Run npm run build in frontend directory
            cmd = "npm run build"
            if sys.platform == "win32":
                subprocess.run(cmd, shell=True, cwd=FRONTEND_DIR, check=True)
            else:
                subprocess.run(["npm", "run", "build"], cwd=FRONTEND_DIR, check=True)
            print("Frontend built successfully!")
        except Exception as e:
            print(f"Warning: Could not build frontend automatically: {e}")
            print("You can build it manually by running: cd frontend && npm run build")
    else:
        print("Verified frontend production bundle in frontend/dist.")

def main():
    check_and_build_frontend()
    
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")

    print("\n" + "=" * 65)
    print(" IP-WATCH: NATIONAL INFRASTRUCTURE MONITORING & EARLY WARNING")
    print(" Unified Single-Project Server (Frontend + Backend + ML)")
    print("=" * 65)
    print(f" Web Application URL : http://{host}:{port}/")
    print(f" REST API & Docs      : http://{host}:{port}/docs")
    print(f" Health Check         : http://{host}:{port}/api/health")
    print("=" * 65 + "\n")

    uvicorn.run("backend.main:app", host=host, port=port, reload=False)

if __name__ == "__main__":
    main()
