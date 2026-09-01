import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('character chat app', () => {
  beforeEach(() => localStorage.clear())

  it('sends a message with Enter and renders a streamed role reply', async () => {
    const user = userEvent.setup()
    render(<App streamDelayMs={0} />)
    const composer = screen.getByLabelText('输入聊天消息')

    await user.type(composer, '今晚会下雨吗？{Enter}')

    expect(screen.getByText('今晚会下雨吗？')).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByLabelText('聊天记录')).getByText(/至少还要下一小时/)).toBeInTheDocument())
  })

  it('uses Shift and Enter for a line break without sending', async () => {
    const user = userEvent.setup()
    render(<App streamDelayMs={0} />)
    const composer = screen.getByLabelText('输入聊天消息')

    await user.type(composer, '第一行{Shift>}{Enter}{/Shift}第二行')

    expect(composer).toHaveValue('第一行\n第二行')
    expect(screen.queryByText('第一行\n第二行')).not.toBeInTheDocument()
  })

  it('allows the user to stop an in-progress role reply', async () => {
    const user = userEvent.setup()
    render(<App streamDelayMs={25} />)
    const composer = screen.getByLabelText('输入聊天消息')

    await user.type(composer, '继续说{Enter}')
    const stopButton = await screen.findByRole('button', { name: '停止生成' })
    await user.click(stopButton)

    expect(await screen.findByText('回复已中断')).toBeInTheDocument()
    expect(screen.getByLabelText('输入聊天消息')).toBeEnabled()
    expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled()
  })
})
