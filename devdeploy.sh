SSHSRV="travis@fgpv.cloudapp.net"
DESTDIR="/home/travis/www"

if [ "$TRAVIS_PULL_REQUEST" == "false" ]; then

    openssl aes-256-cbc -k "$PW" -out ~/.ssh/id_rsa -in devkey.enc -d
    echo -e "Host *\n\tStrictHostKeyChecking no\n" >> ~/.ssh/config
    chmod 600 ~/.ssh/id_rsa
    eval `ssh-agent -s`
    ssh-add ~/.ssh/id_rsa

    if [ "$TRAVIS_REPO_SLUG" == "fgpv-vpgf/fgpv-vpgf" ]; then

        if [ -n "$TRAVIS_TAG" ]; then
            DESTDIR="$DESTDIR/$TRAVIS_TAG/"
        else
            DESTDIR="$DESTDIR/$TRAVIS_BRANCH/"
        fi

    else
        USER=${TRAVIS_REPO_SLUG/\/fgpv-vpgf/}
        DESTDIR="$DESTDIR/users/$USER/$TRAVIS_BRANCH/"
    fi

    echo "Destintation: $DESTDIR"
    # removes the previous build (necessary for long running branches)
    ssh "$SSHSRV" rm -f -r "$DESTDIR"
    ssh "$SSHSRV" mkdir -p "$DESTDIR/dist"
    rsync -av --delete "build/" "$SSHSRV:$DESTDIR/prod"
    rsync -av "dist/" "$SSHSRV:$DESTDIR/dist"
    ssh "$SSHSRV" unzip "$DESTDIR/dist/*-samples.zip" -d "$DESTDIR/dev"
fi
