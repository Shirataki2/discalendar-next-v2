import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";
import { Label } from "./label";

const meta: Meta<typeof Input> = {
	title: "UI/Input",
	component: Input,
	tags: ["autodocs"],
	argTypes: {
		type: {
			control: "select",
			options: ["text", "email", "password", "number", "search", "tel", "url"],
		},
		disabled: { control: "boolean" },
		placeholder: { control: "text" },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		type: "text",
		placeholder: "Enter text...",
	},
};

export const Email: Story = {
	args: {
		type: "email",
		placeholder: "Enter your email...",
	},
};

export const Password: Story = {
	args: {
		type: "password",
		placeholder: "Enter password...",
	},
};

export const Number: Story = {
	args: {
		type: "number",
		placeholder: "Enter number...",
	},
};

export const Search: Story = {
	args: {
		type: "search",
		placeholder: "Search...",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		placeholder: "Disabled input",
	},
};

export const DisabledWithValue: Story = {
	args: {
		disabled: true,
		defaultValue: "Cannot be edited",
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<Label htmlFor="email">Email</Label>
			<Input type="email" id="email" placeholder="Enter your email" />
		</div>
	),
};

export const AllTypes: Story = {
	render: () => (
		<div className="space-y-4 w-full max-w-sm">
			<div className="grid gap-1.5">
				<Label htmlFor="text">Text</Label>
				<Input type="text" id="text" placeholder="Text input" />
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="email-type">Email</Label>
				<Input type="email" id="email-type" placeholder="Email input" />
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="password-type">Password</Label>
				<Input type="password" id="password-type" placeholder="Password input" />
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="number-type">Number</Label>
				<Input type="number" id="number-type" placeholder="Number input" />
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="disabled-type">Disabled</Label>
				<Input type="text" id="disabled-type" placeholder="Disabled" disabled />
			</div>
		</div>
	),
};
