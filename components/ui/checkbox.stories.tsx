import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta: Meta<typeof Checkbox> = {
	title: "UI/Checkbox",
	component: Checkbox,
	tags: ["autodocs"],
	argTypes: {
		checked: { control: "boolean" },
		disabled: { control: "boolean" },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const Checked: Story = {
	args: {
		checked: true,
	},
};

export const Unchecked: Story = {
	args: {
		checked: false,
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		checked: true,
		disabled: true,
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center space-x-2">
			<Checkbox id="terms" />
			<Label htmlFor="terms">Accept terms and conditions</Label>
		</div>
	),
};

export const AllStates: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="flex items-center space-x-2">
				<Checkbox id="unchecked" />
				<Label htmlFor="unchecked">Unchecked</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox id="checked" defaultChecked />
				<Label htmlFor="checked">Checked</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox id="disabled" disabled />
				<Label htmlFor="disabled">Disabled</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox id="disabled-checked" disabled defaultChecked />
				<Label htmlFor="disabled-checked">Disabled Checked</Label>
			</div>
		</div>
	),
};
