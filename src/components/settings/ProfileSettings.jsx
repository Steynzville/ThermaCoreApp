
const ProfileSettings = () => {
  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center space-x-2">
        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Profile
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormFieldGroup
          id="fullName"
          label="Full Name"
          type="text"
          value="John Doe"
        />

        <FormFieldGroup
          id="email"
          label="Email"
          type="email"
          value="john@thermacore.com"
        />
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
