import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Label } from "./label";

const meta: Meta<typeof Label> = {
	title: "UI/Label",
	component: Label,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: "Label",
	},
};

export const WithInput: Story = {
	render: () => (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<Label htmlFor="name">Name</Label>
			<Input type="text" id="name" placeholder="Enter your name" />
		</div>
	),
};

export const WithCheckbox: Story = {
	render: () => (
		<div className="flex items-center space-x-2">
			<Checkbox id="terms" />
			<Label htmlFor="terms">Accept terms and conditions</Label>
		</div>
	),
};

export const DisabledState: Story = {
	render: () => (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<Label htmlFor="disabled-input">Disabled Input</Label>
			<Input
				type="text"
				id="disabled-input"
				placeholder="Cannot edit"
				disabled
			/>
		</div>
	),
};

export const Required: Story = {
	render: () => (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<Label htmlFor="required-input">
				Required Field <span className="text-destructive">*</span>
			</Label>
			<Input type="text" id="required-input" placeholder="This field is required" />
		</div>
	),
};
