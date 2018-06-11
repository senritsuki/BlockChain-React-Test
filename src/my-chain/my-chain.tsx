import * as React from 'react';
import * as lib from './main';
import { DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { TextField } from 'office-ui-fabric-react/lib/TextField';


function renderBlock(block: lib.Block, index: number): JSX.Element {
    return (
        <div className="Block" key={index}>
            <table>
                <tbody>
                    <tr>
                        <td rowSpan={3}>{block.index}</td>
                        <td>data</td>
                        <td>{block.data}</td>
                    </tr>
                    <tr>
                        <td>nonce</td>
                        <td>{block.nonce}</td>
                    </tr>
                    <tr>
                        <td>hash</td>
                        <td>{block.hash.slice(0, 16)} {block.hash.slice(16, 32)} {block.hash.slice(32, 48)} {block.hash.slice(48)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function renderMessage(message: lib.Message, index: number): JSX.Element {
    return (
        <div className="Message" key={index}>
            <table>
                <tbody>
                    <tr>
                        <td rowSpan={2}>{index}</td>
                        <td>{message.sender.name} -> {message.receiver.name}</td>
                    </tr>
                    <tr>
                        <td>{lib.messageTypeToString(message.message.type)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

interface UserProps {
    user: lib.User;
    index: number;
    update: () => void;
}
interface UserState {
    mineData: lib.BlockData;
    mineNonce: number;
    minedBlock: lib.Block|null;
    logs: string[];
}
class User extends React.Component<UserProps, UserState> {
    constructor(props: UserProps) {
        super(props);
        this.state = {
            mineData: '',
            mineNonce: 0,
            minedBlock: null,
            logs: [],
        };
    }
    render() {
        return (
            <div className="ms-Grid-col ms-lg4">
                <h3>{this.props.user.name}</h3>
                <div className="form">
                    <DefaultButton
                        primary={true}
                        text="receive messages"
                        onClick={e => {
                            lib.Users.publish_to(this.props.user)
                            this.props.update()
                        }}
                    />
                </div>
                <div className="Blocks">
                    {this.props.user.blockchain.map((block, i) => renderBlock(block, i))}
                </div>
                <div className="ms-Grid form">
                    <div className="ms-Grid-row">
                        <div className="ms-Grid-col ms-lg8">
                            <TextField
                                label="data"
                                value={this.state.mineData}
                                onChanged={s => this.setState({mineData: s})}
                            />
                        </div>
                        <div className="ms-Grid-col ms-lg4">
                            <TextField
                                label="nonce"
                                value={'' + this.state.mineNonce}
                                onChanged={s => this.setState({mineNonce: +s})}
                            />
                        </div>
                        <div className="ms-Grid-col ms-lg6">
                            <DefaultButton
                                primary={true}
                                text="mine"
                                onClick={e => {
                                    const block = lib.Server.mineBlock(this.props.user, this.state.mineData, this.state.mineNonce)
                                    this.setState({minedBlock: block})
                                }}
                            />
                        </div>
                    </div>
                </div>
                <div className="Blocks">
                    {this.state.minedBlock ? renderBlock(this.state.minedBlock, 0): <div>-</div>}
                </div>
                <div className="form">
                    <DefaultButton
                        primary={true}
                        text="broadcast mined block"
                        disabled={this.state.minedBlock != null}
                        onClick={e => {
                            if (this.state.minedBlock) {
                                const addResult = lib.Server.addBlock(this.props.user, this.state.minedBlock)
                                this.setState({
                                    mineData: '',
                                    mineNonce: 0,
                                    minedBlock: null,
                                    logs: this.state.logs.concat(addResult),
                                })
                                this.props.update()
                            }
                        }}
                    />
                </div>
                <div>
                    <ul>
                        {this.state.logs.map((log, i) => <li key={i}>{log}</li>)}
                    </ul>
                </div>
            </div>
        );
    }
}

interface State {
    _count: number;
    addUserName: string;
}
export class Component extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            addUserName: '',
            _count: 0,
        };
    }
    public render(): JSX.Element {
        return (
            <div className="ms-Grid MyChain">
                <div className="ms-Grid-row">
                    <h2>ユーザ一覧</h2>
                    {lib.Users.users.map((user, i) => <User user={user} index={i} key={i} update={() => this.setState({_count: this.state._count+1})} />)}
                </div>
                <div className="ms-Grid-row">
                    <h2>データ管理</h2>
                    <div className="ms-Grid-col ms-lg4">
                        <h2>ユーザ登録</h2>
                        <TextField
                            label="user name"
                            value={this.state.addUserName}
                            onChanged={s => this.setState({addUserName: s})}
                        />
                        <DefaultButton
                            primary={true}
                            text="add user"
                            onClick={e => {
                                const hoge = this.state.addUserName;
                                lib.Server.addPeer(hoge)
                                this.setState({addUserName: ''})
                            }}
                        />
                    </div>
                    <div className="ms-Grid-col ms-lg4">
                        <h2>メッセージキュー</h2>
                        {lib.Users.messages.map((message, i) => renderMessage(message, i))}
                    </div>
                </div>
            </div>
        );
    }
}
