import os
import subprocess
import json
import getpass
import urllib.request
import urllib.error

def run_command(command):
    try:
        # Run command and capture output
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        # Silently fail for some commands (like git remote remove)
        return None

def github_request(url, token, data=None, method="GET"):
    """Makes a GitHub API request using only standard library urllib."""
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Python-Deployment-Script"
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.getcode(), json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except:
            return e.code, None
    except Exception as e:
        print(f"Network error: {e}")
        return None, None

def main():
    print("🚀 GitHub AI Model Auto-Deployer")
    print("-" * 35)
    
    # 1. Gather Info
    repo_name = input("Enter new repository name: ").strip()
    if not repo_name:
        print("❌ Repository name cannot be empty.")
        return

    # Securely get the token
    token = getpass.getpass("Paste GitHub Token (will be invisible): ").strip()
    if not token:
        print("❌ Token is required.")
        return

    # 2. Create Repository via API
    print(f"\nPhase 1: Creating '{repo_name}' on GitHub...")
    code, data = github_request(
        "https://api.github.com/user/repos",
        token,
        data={"name": repo_name, "private": False},
        method="POST"
    )

    if code == 201:
        print("✅ Success! Repository created.")
        clone_url = data["clone_url"]
    elif code == 422:
        print("⚠️  Repository already exists. Connecting to existing one...")
        code, user_data = github_request("https://api.github.com/user", token)
        username = user_data["login"]
        clone_url = f"https://github.com/{username}/{repo_name}.git"
    else:
        print(f"❌ API Error {code}: {data}")
        return

    # 3. Git Operations
    print("\nPhase 2: Initializing local files...")
    
    if not os.path.exists(".git"):
        run_command("git init")
    
    # Setup remote with token embedded for easy auth
    run_command("git remote remove origin")
    auth_url = clone_url.replace("https://", f"https://{token}@")
    run_command(f"git remote add origin {auth_url}")

    # 4. Handle Large Files (LFS)
    print("Phase 3: Setting up Git LFS (Large File Storage)...")
    run_command("git lfs install")
    # Automatically track common large model formats
    run_command('git lfs track "*.bin" "*.pt" "*.h5" "*.onnx" "*.weights" "*.pkl" "*.tflite"')
    
    # 5. Commit and Push
    print("Phase 4: Committing and Pushing to GitHub...")
    run_command("git add .")
    run_command('git commit -m "Auto-deployed AI model"')
    
    # Try pushing to main (modern) then master (legacy)
    result = run_command("git push -u origin main")
    if result is None:
        result = run_command("git push -u origin master")
    
    if result is not None:
        print(f"\n✨ ALL DONE! Your model is live at:")
        print(f"🔗 {clone_url}")
    else:
        print("\n❌ Push failed. Make sure your token has 'repo' permissions.")

if __name__ == "__main__":
    main()
