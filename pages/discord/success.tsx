import React from 'react'
import { WithLayout } from '../../@types/page'
import { getLayout } from '../../components/Layout'
import Title from '../../components/Title'
import Card from '../../components/Card'
import NavLink from '../../components/NavLink'
import { GetServerSidePropsContext, NextApiResponse } from 'next'
import { Request, Response } from 'express'
import { LoggedRequest } from '../../@types/helpers'
import Link from 'next/link'
import Image from 'next/image'
import { DiscordUserInfo, getDiscordUserInfo } from '../../helpers/discordAuth'
import { getSession } from 'next-auth/react'
import { Session } from '../../@types/auth'

type ConnectToDiscordSuccessProps = {
  errorCode: number
  username: string
  userInfo: DiscordUserInfo
  error: Error
}

type DiscordErrorPageProps = {
  error: Error
  username: string
  navPath: string
  navText: string
}

type Error = {
  message: string
}

export enum ErrorCode {
  USER_NOT_LOGGED_IN = 1,
  DISCORD_ERROR = 2,
  DIFFERENT_ACCOUNT_IS_CONNECTED = 2
}

const DISCORD_BUGS_FEEDBACK_URL =
  'https://discord.com/channels/828783458469675019/836343487531712512'

const DiscordErrorPage: React.FC<DiscordErrorPageProps> = ({
  username,
  error,
  navPath,
  navText
}) => {
  let errorMessage = <></>,
    errorLog = <></>
  if (!username) {
    errorMessage = (
      <>
        <p>You need to be logged in to connect to Discord.</p>
        <p>
          or go straight <NavLink path="/curriculum">to the curriculum</NavLink>{' '}
          without an account
        </p>
      </>
    )
  } else {
    errorMessage = (
      <>
        <p>
          Dear {username}, we had trouble connecting to Discord, please try
          again.
        </p>
      </>
    )
  }
  if (error?.message) {
    errorLog = (
      <>
        <hr />
        <p>Error log</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </>
    )
  }
  return (
    <>
      <Title title="Error" />
      <Card title="Error">
        <div className="mt-3">{errorMessage}</div>
        <p>
          If this problem persists, please ask for help in our{' '}
          <NavLink path={DISCORD_BUGS_FEEDBACK_URL} external>
            Discord channel.
          </NavLink>
        </p>
        <NavLink path={navPath}>
          <button
            type="button"
            className="btn btn-primary btn-lg btn-block mb-3"
          >
            {navText}
          </button>
        </NavLink>
        {errorLog}
      </Card>
    </>
  )
}

export const ConnectToDiscordSuccess: React.FC<ConnectToDiscordSuccessProps> &
  WithLayout = ({ errorCode, username, userInfo, error }) => {
  if (errorCode === ErrorCode.DISCORD_ERROR)
    return (
      <DiscordErrorPage
        username={username}
        error={error}
        navPath="/curriculum"
        navText="Try Again"
      />
    )
  if (errorCode === ErrorCode.USER_NOT_LOGGED_IN)
    return (
      <DiscordErrorPage
        username=""
        error={error}
        navPath="/login"
        navText="Log In Here"
      />
    )

  if (errorCode === ErrorCode.DIFFERENT_ACCOUNT_IS_CONNECTED) {
    return (
      <DiscordErrorPage
        username={username}
        error={{
          message:
            "The account you're trying to connect with is already connected with one of c0d3 accounts."
        }}
        navPath="/curriculum"
        navText="Already connected"
      />
    )
  }
  return (
    <>
      <Title title="Success!" />
      <Card title="Success!">
        <>
          <div className="ms-auto me-auto">
            <Image
              className="avatar"
              src={userInfo.avatarUrl}
              width={120}
              height={120}
            />
          </div>
          <h5 className="mb-4">
            <Link href={`https://discordapp.com/users/${userInfo.userId}/`}>
              {userInfo.username}
            </Link>
          </h5>
          <style jsx global>{`
            .avatar {
              border-radius: 50%;
            }
          `}</style>
        </>
        <p>{username}, you are now connected to Discord!</p>
        <NavLink path="/curriculum">
          <button
            type="button"
            className="btn btn-primary btn-lg btn-block mb-3"
          >
            Continue to Curriculum
          </button>
        </NavLink>
      </Card>
    </>
  )
}

export const getServerSideProps = async ({
  req,
  query
}: GetServerSidePropsContext) => {
  if (query.error === 'connected') {
    return { props: { errorCode: ErrorCode.DIFFERENT_ACCOUNT_IS_CONNECTED } }
  }
  const { user: sessionUser } = ((await getSession({ req })) as Session) || {}

  if (!sessionUser)
    return { props: { errorCode: ErrorCode.USER_NOT_LOGGED_IN } }

  const prisma = await import('../../prisma')
  const user = await prisma.default.user.findFirst({
    where: {
      id: sessionUser.id
    }
  })
  if (!user) return { props: { errorCode: ErrorCode.USER_NOT_LOGGED_IN } }

  const userInfo = await getDiscordUserInfo(user)

  if (!userInfo.userId) return { props: { errorCode: ErrorCode.DISCORD_ERROR } }

  return { props: { userInfo, username: user.username } }
}

ConnectToDiscordSuccess.getLayout = getLayout

export default ConnectToDiscordSuccess
