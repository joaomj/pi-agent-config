@echo off
REM Thin wrapper. Policy lives in hooks\pass-cli-shim.py in this repo.
python "%USERPROFILE%\repos\proton-pass-skill\hooks\pass-cli-shim.py" %*
