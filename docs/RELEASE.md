# Releasing NyxApse: APK and F-Droid

What is what:
- `android/` is a tiny native app that shows the bundled game. It has no libraries and no ads.
- `fastlane/` is the store listing (title, description, icon, screenshots) that F-Droid reads.
- `fdroid/` is the entry you submit to F-Droid. The app does not use it.
- `tools/set_version.py` changes the version in every place at once.

## 1. Set the version
From the project folder:

    python3 tools/set_version.py 1.0.0 1

- The first number is what people see (`1.0.0`, `1.1.0`, ...).
- The second number is the version code. It must go UP on every release (1, 2, 3, ...).
- It updates: `android/app/build.gradle`, the About page footer, the four version stamps in `js/`, the `?v=` file
  addresses in every page and in `sw.js`, and it creates the changelog file for this release.
- By hand afterwards: edit `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt` (one or two lines about what changed)
  and, when you submit to F-Droid, `fdroid/io.github.shadowed_monarch.nyxapse.yml` (versionName, versionCode, commit).

Doing it by hand instead? Change all of these to the same version:
1. `android/app/build.gradle`: `versionCode` and `versionName`
2. `about.html`: the footer line `NyxApse v...`
3. `js/theme.js` (`BT_BUILD`), `js/game.js` (`BT.build`), `js/shell.js` (`shell:` and the `!==` in the out-of-date check), `js/leaderboard.js` (`build:`)
4. every `?v=...` in the `.html` files and in `sw.js`, and the `bt-v...` cache name in `sw.js`

## 2. Build the APK (free, nothing to install)
1. Push the project to GitHub.
2. Open the repo's **Actions** tab, choose **Build Android APK**, press **Run workflow**.
3. Wait about 5 minutes. Open the finished run and download **NyxApse-apk** under Artifacts. Unzip it to get the `.apk`.
4. Copy the APK to your phone and open it. Android will ask to allow installs from this source. Allow it, then install.
5. If the run fails, open the red step, copy the error text and send it to me.

This APK is signed with a temporary debug key, which is fine for testing. A debug APK and the F-Droid version are signed with
different keys, so they cannot update each other: uninstall one before installing the other.

## 3. Test before you release
Open the app and check: first launch asks for a nickname, a game plays, Settings opens, Export shows the code box,
the sound keeps playing between pages, the back button goes back, and (if you set up Supabase) the leaderboard loads.

## 4. Make a release on GitHub
    git tag v1.0.0
    git push origin v1.0.0
The workflow builds the APK again and attaches it to the release.

## 5. Submit to F-Droid
1. The GitHub repo must be public and the tag `v1.0.0` must exist. The `LICENSE` file is already there.
2. Make an account on gitlab.com and fork https://gitlab.com/fdroid/fdroiddata
3. In your fork, add the file `metadata/io.github.shadowed_monarch.nyxapse.yml` (copy it from `fdroid/`).
4. Commit it on a new branch and open a **Merge Request** to `fdroid/fdroiddata`. Their automatic checks run; read the results and fix what they ask.
5. A volunteer reviews it. This can take days or weeks. Answer questions politely. They may ask you to add the `NonFreeNet`
   label because the optional leaderboard uses a hosted Supabase server. That does not stop the app being included.
6. After it is merged, F-Droid builds the app from your source, signs it and publishes it. This takes a few more days.
Read F-Droid's current guide first: f-droid.org/docs (Submitting to F-Droid, and the Inclusion Policy). Their rules change.

## 6. Releasing an update
1. Make your changes.
2. `python3 tools/set_version.py 1.0.1 2`, then write the new changelog file.
3. Commit, then `git tag v1.0.1` and `git push origin v1.0.1`.
4. F-Droid watches your tags (`UpdateCheckMode: Tags`). It usually adds the new version by itself within days.

## Notes
- The APK build was written but could not be run where it was created. If the first GitHub build fails, send me the log.
- Needs Android 7 or newer. For the best look, keep "Android System WebView" updated (the game uses modern CSS).
- Progress is stored inside the app. Uninstalling deletes it. Use Settings -> Data -> Export first.
